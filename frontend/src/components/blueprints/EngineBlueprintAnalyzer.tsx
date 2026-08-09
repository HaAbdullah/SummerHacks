"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CarFront,
  CheckCircle2,
  Download,
  FileImage,
  GitBranch,
  ImagePlus,
  LoaderCircle,
  MessageSquarePlus,
  RotateCcw,
  ScanLine,
  Search,
  Upload,
  Wrench,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  analyzeEngineImage,
  createBranch,
  getGraph,
  renderEngineBlueprint,
  searchCars,
  uploadNote,
} from "@/lib/api";
import type { BoundingBox, Car, EngineAnalysisResponse } from "@/lib/types";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type RunStatus =
  | "idle"
  | "ready"
  | "analyzing"
  | "rendering"
  | "complete"
  | "error";
type PreviewMode = "blueprint" | "inspection";

function boxStyle(box: BoundingBox) {
  return {
    left: `${box.x1 * 100}%`,
    top: `${box.y1 * 100}%`,
    width: `${(box.x2 - box.x1) * 100}%`,
    height: `${(box.y2 - box.y1) * 100}%`,
  };
}

function confidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function EngineBlueprintAnalyzer() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blueprintUrl, setBlueprintUrl] = useState<string | null>(null);
  const [blueprintBlob, setBlueprintBlob] = useState<Blob | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("inspection");
  const [imageRatio, setImageRatio] = useState("4 / 3");
  const [status, setStatus] = useState<RunStatus>("idle");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EngineAnalysisResponse | null>(null);
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const [vehicleQuery, setVehicleQuery] = useState("");
  const [vehicles, setVehicles] = useState<Car[]>([]);
  const [vehicleSearchLoading, setVehicleSearchLoading] = useState(false);
  const [discussionLoadingId, setDiscussionLoadingId] = useState<string | null>(null);
  const [discussionError, setDiscussionError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (blueprintUrl) URL.revokeObjectURL(blueprintUrl);
    };
  }, [blueprintUrl]);

  const chooseFile = (nextFile: File) => {
    if (!ACCEPTED_TYPES.includes(nextFile.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      setStatus("error");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (nextFile.size > MAX_IMAGE_BYTES) {
      setError("The image must be 15MB or smaller.");
      setStatus("error");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
    setImageRatio("4 / 3");
    setResult(null);
    if (blueprintUrl) URL.revokeObjectURL(blueprintUrl);
    setBlueprintUrl(null);
    setBlueprintBlob(null);
    setPreviewMode("inspection");
    setError(null);
    setStatus("ready");
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (nextFile) chooseFile(nextFile);
  };

  const loadHondaDemo = async () => {
    setDemoLoading(true);
    setError(null);
    try {
      const response = await fetch("/blueprints/honda-turbo-engine.png");
      if (!response.ok) throw new Error("The Honda turbo test image is unavailable.");
      const blob = await response.blob();
      chooseFile(
        new File([blob], "HondaTurboInline4.png", {
          type: blob.type || "image/png",
        }),
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "The Honda turbo test image could not load.",
      );
      setStatus("error");
    } finally {
      setDemoLoading(false);
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const nextFile = event.dataTransfer.files?.[0];
    if (nextFile) chooseFile(nextFile);
  };

  const runAnalysis = async () => {
    if (!file) return;
    setStatus("analyzing");
    setError(null);
    try {
      const analysis = await analyzeEngineImage(file);
      setResult(analysis);
      setStatus("rendering");
      const blueprint = await renderEngineBlueprint(file, analysis);
      setBlueprintBlob(blueprint);
      setBlueprintUrl(URL.createObjectURL(blueprint));
      setPreviewMode("blueprint");
      setStatus("complete");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message.replace(/^\d+\s+\/blueprints\/engine\/analyze:\s*/, "")
          : "Engine analysis failed.",
      );
      setStatus("error");
    }
  };

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (blueprintUrl) URL.revokeObjectURL(blueprintUrl);
    if (inputRef.current) inputRef.current.value = "";
    setFile(null);
    setPreviewUrl(null);
    setBlueprintUrl(null);
    setBlueprintBlob(null);
    setPreviewMode("inspection");
    setResult(null);
    setError(null);
    setStatus("idle");
  };

  const components = result?.analysis.components ?? [];
  const modificationCount = components.filter(
    (component) => component.possible_modification,
  ).length;
  const showingBlueprint = Boolean(
    blueprintUrl && previewMode === "blueprint",
  );
  const blueprintFilename = `${file?.name.replace(/\.[^.]+$/, "") ?? "engine"}-blueprint.jpg`;

  const findVehicles = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = vehicleQuery.trim();
    if (!query) return;
    setVehicleSearchLoading(true);
    setDiscussionError(null);
    try {
      setVehicles(await searchCars(query));
    } catch (reason) {
      setDiscussionError(
        reason instanceof Error ? reason.message : "Vehicle search failed.",
      );
    } finally {
      setVehicleSearchLoading(false);
    }
  };

  const createDiscussion = async (car: Car) => {
    if (!blueprintBlob || !result) return;
    setDiscussionLoadingId(car.id);
    setDiscussionError(null);
    try {
      const nodes = await getGraph(car.id, {
        make: car.make,
        model: car.model,
        generation: car.generation,
      });
      let root = nodes.find((node) => node.parentIds.length === 0);
      if (!root) {
        root = await createBranch(car.id, [], {
          title: `${car.make} ${car.model} Stock`,
          mods: { engine: "", exhaust: "", wheels: "", brakes: "" },
          summary: `Starting point for ${car.make} ${car.model} ${car.generation ?? car.yearRange}.`,
        });
      }

      const engineLabel = result.analysis.engine_type ?? "Engine blueprint";
      const node = await createBranch(car.id, [root.id], {
        title: `${engineLabel} Discussion`,
        mods: { engine: engineLabel, exhaust: "", wheels: "", brakes: "" },
        summary: result.analysis.engine_description,
        createdBy: "You",
      });
      await uploadNote(node.id, blueprintBlob, {
        kind: "blueprint",
        author: "You",
        filename: blueprintFilename,
        body: `Generated engine blueprint for ${car.make} ${car.model} ${car.generation ?? ""}.`.trim(),
      });
      router.push(
        `/garage/${encodeURIComponent(car.id)}/node/${encodeURIComponent(node.id)}`,
      );
    } catch (reason) {
      setDiscussionError(
        reason instanceof Error
          ? reason.message
          : "The blueprint discussion could not be created.",
      );
      setDiscussionLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-line bg-black/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/"
            className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-white/5 text-muted transition-colors hover:text-ink"
            aria-label="Back to BuildaMod"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent">
              <GitBranch className="h-4 w-4 text-white" />
            </span>
            <span className="heading-font text-lg font-bold">BuildaMod</span>
          </div>
          <div className="hidden h-6 w-px bg-line sm:block" />
          <div className="min-w-0">
            <h1 className="heading-font truncate text-base font-bold sm:text-lg">
              Engine Blueprint Lab
            </h1>
            <p className="truncate text-[10px] font-bold uppercase text-muted-2">
              Visual analysis checkpoint
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {file && (
            <button
              type="button"
              onClick={reset}
              disabled={status === "analyzing" || status === "rendering"}
              className="focus-ring flex h-9 items-center gap-2 rounded-md border border-line bg-white/5 px-3 text-xs font-semibold text-muted hover:text-ink disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
          {blueprintBlob && (
            <button
              type="button"
              onClick={() => setDiscussionOpen(true)}
              className="focus-ring flex h-9 items-center gap-2 rounded-md border border-line bg-white/5 px-3 text-xs font-semibold text-ink hover:bg-white/10"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Start discussion</span>
            </button>
          )}
          {blueprintUrl && (
            <a
              href={blueprintUrl}
              download={blueprintFilename}
              className="focus-ring flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-bold text-primary-fg hover:bg-primary-hover"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download JPEG</span>
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-64px)] w-full max-w-[1600px] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_390px]">
        <section className="min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase text-accent">
                {showingBlueprint ? "Generated artifact" : "Source inspection"}
              </p>
              <h2 className="heading-font text-2xl font-bold">
                {showingBlueprint ? "Blueprint document" : "Engine image"}
              </h2>
            </div>
            {blueprintUrl ? (
              <div className="flex h-9 items-center rounded-md border border-line bg-black p-1">
                <button
                  type="button"
                  onClick={() => setPreviewMode("blueprint")}
                  className={`h-7 rounded-sm px-3 text-[10px] font-bold uppercase transition-colors ${
                    previewMode === "blueprint"
                      ? "bg-white text-black"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  Blueprint
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("inspection")}
                  className={`h-7 rounded-sm px-3 text-[10px] font-bold uppercase transition-colors ${
                    previewMode === "inspection"
                      ? "bg-white text-black"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  Inspection
                </button>
              </div>
            ) : result && status === "rendering" ? (
              <div className="flex items-center gap-2 text-xs text-muted">
                <LoaderCircle className="h-4 w-4 animate-spin text-accent" />
                Composing blueprint
              </div>
            ) : result ? (
              <div className="flex items-center gap-2 text-xs text-muted">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Inspection complete
              </div>
            ) : null}
          </div>

          {!previewUrl ? (
            <div
              onDragEnter={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`flex min-h-[500px] flex-col items-center justify-center rounded-lg border border-dashed px-6 text-center transition-colors ${
                dragging
                  ? "border-accent bg-accent/10"
                  : "border-line-strong bg-surface/60"
              }`}
            >
              <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg border border-line bg-black text-accent">
                <ImagePlus className="h-6 w-6" />
              </span>
              <h2 className="heading-font mb-2 text-xl font-bold">
                Upload engine image
              </h2>
              <p className="mb-6 text-sm text-muted">JPEG, PNG or WebP - 15MB max</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <label
                  htmlFor="engine-image-upload"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      inputRef.current?.click();
                    }
                  }}
                  className="focus-ring flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-bold text-primary-fg hover:bg-primary-hover"
                >
                  <Upload className="h-4 w-4" />
                  Choose image
                </label>
                <button
                  type="button"
                  onClick={loadHondaDemo}
                  disabled={demoLoading}
                  className="focus-ring flex h-11 items-center gap-2 rounded-md border border-line bg-white/5 px-5 text-sm font-bold text-ink hover:bg-white/10 disabled:opacity-50"
                >
                  {demoLoading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileImage className="h-4 w-4" />
                  )}
                  Load Honda turbo test
                </button>
              </div>
              <input
                id="engine-image-upload"
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onFileChange}
                className="sr-only"
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-line bg-black">
              <div
                className="relative w-full overflow-hidden bg-black"
                style={{ aspectRatio: showingBlueprint ? "8 / 5" : imageRatio }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={(showingBlueprint ? blueprintUrl : previewUrl) ?? undefined}
                  alt={showingBlueprint ? "Generated engine blueprint" : "Uploaded engine"}
                  onLoad={(event) => {
                    if (showingBlueprint) return;
                    const image = event.currentTarget;
                    setImageRatio(`${image.naturalWidth} / ${image.naturalHeight}`);
                  }}
                  className="absolute inset-0 h-full w-full object-contain"
                />

                {!showingBlueprint && result?.image_context.engine_bbox && (
                  <div
                    className="pointer-events-none absolute border border-accent shadow-[0_0_0_1px_rgba(255,60,60,0.25)]"
                    style={boxStyle(result.image_context.engine_bbox)}
                  >
                    <span className="absolute -top-6 left-0 bg-accent px-2 py-1 text-[9px] font-bold uppercase text-white">
                      Engine {confidence(result.image_context.confidence)}
                    </span>
                  </div>
                )}

                {!showingBlueprint && components.map((component, index) => (
                  <div
                    key={component.id}
                    className="pointer-events-none absolute border border-cyan-300/70 bg-cyan-300/5"
                    style={boxStyle(component.bbox)}
                  >
                    <span className="absolute -left-px -top-px flex h-5 min-w-5 items-center justify-center bg-cyan-300 px-1 text-[9px] font-black text-black">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                ))}

                {(status === "analyzing" || status === "rendering") && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm">
                    <LoaderCircle className="mb-4 h-8 w-8 animate-spin text-accent" />
                    <p className="heading-font text-lg font-bold">
                      {status === "rendering" ? "Generating blueprint" : "Analyzing engine"}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {status === "rendering"
                        ? "Extracting the engine and composing the technical sheet"
                        : "Inspecting visible geometry and components"}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 border-t border-line bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {showingBlueprint
                      ? blueprintFilename
                      : file?.name}
                  </p>
                  <p className="text-[10px] uppercase text-muted-2">
                    {showingBlueprint
                      ? "JPEG blueprint document"
                      : file
                        ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                        : ""}
                  </p>
                </div>
                {!result && (
                  <button
                    type="button"
                    onClick={runAnalysis}
                    disabled={status === "analyzing"}
                    className="focus-ring flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-bold text-white hover:bg-accent-hover disabled:cursor-wait disabled:opacity-60"
                  >
                    {status === "analyzing" ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <ScanLine className="h-4 w-4" />
                    )}
                    {status === "analyzing" ? "Analyzing" : "Analyze engine"}
                  </button>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-3 rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <div className="flex-1">
                <p className="font-semibold">Blueprint generation failed</p>
                <p className="mt-1 text-xs text-red-200/70">{error}</p>
              </div>
              {file && (
                <button
                  type="button"
                  onClick={runAnalysis}
                  className="text-xs font-bold text-white hover:underline"
                >
                  Retry
                </button>
              )}
            </div>
          )}
        </section>

        <aside className="border-t border-line bg-bg-muted lg:border-l lg:border-t-0">
          <div className="border-b border-line p-5 sm:p-6">
            <p className="mb-1 text-[10px] font-bold uppercase text-accent-blue">
              Inspection report
            </p>
            <h2 className="heading-font text-xl font-bold">
              {result
                ? (result.analysis.engine_type ?? "Engine detected")
                : "Awaiting analysis"}
            </h2>
            <p className="mt-2 text-xs leading-5 text-muted">
              {result?.analysis.engine_description ?? "No engine data loaded."}
            </p>
          </div>

          {result ? (
            <>
              <div className="grid grid-cols-3 border-b border-line">
                <Metric label="Context" value={result.image_context.image_type.replace("_", " ")} />
                <Metric label="Visible" value={String(components.length)} accent="text-cyan-300" />
                <Metric label="Modified" value={String(modificationCount)} accent="text-accent" last />
              </div>

              <div className="scroll-soft max-h-[calc(100vh-270px)] overflow-y-auto">
                {components.map((component, index) => (
                  <article key={component.id} className="border-b border-line p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 min-w-7 items-center justify-center rounded-sm bg-cyan-300 text-[10px] font-black text-black">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-sm font-bold text-ink">{component.name}</h3>
                          <span className="font-mono text-[10px] text-cyan-300">
                            {confidence(component.confidence)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[9px] font-bold uppercase text-muted-2">
                          {component.category}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-muted">{component.description}</p>
                        {component.possible_modification && (
                          <div className="mt-3 flex items-start gap-2 border-l-2 border-accent pl-3">
                            <Wrench className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                            <p className="text-[10px] font-semibold uppercase text-red-200">
                              {component.modification_description ?? "Visible modification"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center px-8 text-center">
              <ScanLine className="mb-4 h-7 w-7 text-muted-2" />
              <p className="text-sm font-semibold text-ink-soft">No component data</p>
              <p className="mt-1 text-xs text-muted-2">Upload an engine image to begin.</p>
            </div>
          )}
        </aside>
      </main>

      {discussionOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="discussion-title"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !discussionLoadingId) {
              setDiscussionOpen(false);
            }
          }}
        >
          <div className="w-full max-w-xl overflow-hidden rounded-lg border border-line bg-bg shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase text-accent">
                  Blueprint discussion
                </p>
                <h2 id="discussion-title" className="heading-font mt-1 text-lg font-bold">
                  Choose vehicle generation
                </h2>
              </div>
              <button
                type="button"
                title="Close"
                aria-label="Close"
                disabled={Boolean(discussionLoadingId)}
                onClick={() => setDiscussionOpen(false)}
                className="focus-ring flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-white/5 hover:text-ink disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={findVehicles} className="flex gap-2 border-b border-line p-5">
              <label htmlFor="blueprint-vehicle-search" className="sr-only">
                Search vehicle
              </label>
              <div className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-md border border-line bg-black px-3 focus-within:border-line-strong">
                <Search className="h-4 w-4 shrink-0 text-muted-2" />
                <input
                  id="blueprint-vehicle-search"
                  value={vehicleQuery}
                  onChange={(event) => setVehicleQuery(event.target.value)}
                  placeholder="2018 Honda Civic"
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted-2"
                />
              </div>
              <button
                type="submit"
                title="Search"
                aria-label="Search"
                disabled={!vehicleQuery.trim() || vehicleSearchLoading}
                className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-fg hover:bg-primary-hover disabled:opacity-40"
              >
                {vehicleSearchLoading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </button>
            </form>

            <div className="scroll-soft max-h-80 overflow-y-auto">
              {vehicles.map((car) => (
                <button
                  key={car.id}
                  type="button"
                  disabled={Boolean(discussionLoadingId)}
                  onClick={() => createDiscussion(car)}
                  className="focus-ring flex w-full items-center gap-4 border-b border-line px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-white/5 disabled:opacity-50"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line bg-black text-cyan-300">
                    {discussionLoadingId === car.id ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <CarFront className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink">
                      {car.make} {car.model}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted">
                      {car.generation} - {car.yearRange}
                    </span>
                  </span>
                  <MessageSquarePlus className="h-4 w-4 shrink-0 text-muted-2" />
                </button>
              ))}
              {!vehicleSearchLoading && vehicleQuery && vehicles.length === 0 && !discussionError && (
                <p className="px-5 py-10 text-center text-sm text-muted">
                  No matching generations.
                </p>
              )}
            </div>

            {discussionError && (
              <div className="flex items-start gap-3 border-t border-red-500/20 bg-red-500/10 px-5 py-4 text-xs text-red-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <p>{discussionError}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  accent = "text-ink",
  last = false,
}: {
  label: string;
  value: string;
  accent?: string;
  last?: boolean;
}) {
  return (
    <div className={`min-w-0 p-4 ${last ? "" : "border-r border-line"}`}>
      <p className="text-[9px] font-bold uppercase text-muted-2">{label}</p>
      <p className={`mt-1 truncate text-xs font-bold ${accent}`}>{value}</p>
    </div>
  );
}
