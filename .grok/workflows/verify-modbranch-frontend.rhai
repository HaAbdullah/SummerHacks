let meta = #{
    name: "verify-modbranch-frontend",
    description: "Verify MODBRANCH frontend against IMPLEMENTATION_GUIDE and fix gaps (frontend/ only)",
    phases: [
        #{ title: "Audit", detail: "structure and contract vs guide" },
        #{ title: "Fix", detail: "parallel fixes for critical gaps" },
        #{ title: "Build", detail: "production build must pass" },
    ],
};

let audit_schema = #{
    "type": "object",
    "required": ["ok", "gaps"],
    "properties": #{
        "ok": #{ "type": "boolean" },
        "gaps": #{
            "type": "array",
            "maxItems": 12,
            "items": #{
                "type": "object",
                "required": ["area", "issue", "severity"],
                "properties": #{
                    "area": #{ "type": "string" },
                    "issue": #{ "type": "string" },
                    "severity": #{ "type": "string" },
                },
            },
        },
    },
};

let fix_schema = #{
    "type": "object",
    "required": ["fixed", "notes"],
    "properties": #{
        "fixed": #{ "type": "boolean" },
        "notes": #{ "type": "string" },
    },
};

phase("Audit");

let audit_prompt = "";
audit_prompt += "Verify MODBRANCH frontend under frontend/ only. ";
audit_prompt += "Read IMPLEMENTATION_GUIDE.md (repo root) and frontend/DESIGN.md. ";
audit_prompt += "Use read_file, list_dir, grep. Do not answer from memory. ";
audit_prompt += "Check file structure, mock API, seed DAG (~30 nodes, one merge Night Runner, Tiger Spec V8), ";
audit_prompt += "landing + garage pages, graph/navigator/overlay/guide components. ";
audit_prompt += "Return only real demo-blocking gaps. severity: critical|major|minor. Empty gaps if demo-ready.";

let audit = agent(audit_prompt, #{
    label: "audit-guide",
    capability_mode: "read-only",
    output_schema: audit_schema,
});

if audit == () || !audit.success || audit.output == () {
    complete(#{ summary: "Audit agent failed", gaps: [] });
}

let gaps = audit.output.gaps;
if gaps == () { gaps = []; }
log("Audit gaps: " + gaps.len().to_string());

if gaps.len() == 0 {
    phase("Build");
    let build = agent(
        "Confirm frontend production build. Run: cd frontend; npm run build. fixed=true only if exit 0.",
        #{ label: "build-pass", capability_mode: "all", output_schema: fix_schema },
    );
    complete(#{ summary: "No gaps", gaps: [], build: build });
}

phase("Fix");
let jobs = [];
let i = 0;
for g in gaps {
    if i >= 5 { break; }
    let p = "";
    p += "Fix MODBRANCH frontend gap. ONLY edit frontend/. ";
    p += "Area: " + g.area + ". Issue: " + g.issue + ". ";
    p += "Read IMPLEMENTATION_GUIDE.md and frontend/DESIGN.md. Inspect then fix. fixed=true when done.";
    jobs.push(#{
        prompt: p,
        label: "fix-" + i.to_string(),
        capability_mode: "all",
        output_schema: fix_schema,
    });
    i += 1;
}

let fix_results = parallel(jobs);
let fixed_count = 0;
for r in fix_results {
    if r != () && r.success && r.output != () && r.output.fixed == true {
        fixed_count += 1;
    }
}

phase("Build");
let build2 = agent(
    "Run: cd frontend; npm run build. Fix only frontend/ if needed. fixed=true only if build succeeds.",
    #{ label: "build-after-fix", capability_mode: "all", output_schema: fix_schema },
);

complete(#{
    summary: fixed_count.to_string() + " fixes applied",
    gaps_found: gaps.len(),
    fixes: fixed_count,
    build: build2,
});
