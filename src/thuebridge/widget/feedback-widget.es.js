import { jsxs as l, Fragment as O, jsx as e } from "react/jsx-runtime";
import { useState as h, useEffect as D } from "react";
const H = "https://thebridgeserver-production-fc18.up.railway.app";
function N(s) {
  if (Array.isArray(s))
    return s;
  if (typeof s == "string")
    try {
      const r = JSON.parse(s);
      return Array.isArray(r) ? r : [];
    } catch {
      return [];
    }
  return [];
}
function J({
  field: s,
  value: r,
  onChange: o
}) {
  const i = "w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400";
  switch (s.fieldType) {
    case "text":
      return /* @__PURE__ */ e(
        "input",
        {
          type: "text",
          className: i,
          placeholder: s.placeholder,
          value: r,
          onChange: (t) => o(t.target.value),
          required: s.required
        }
      );
    case "textarea":
      return /* @__PURE__ */ e(
        "textarea",
        {
          className: `${i} min-h-24 resize-y`,
          placeholder: s.placeholder,
          value: r,
          onChange: (t) => o(t.target.value),
          required: s.required
        }
      );
    case "email":
      return /* @__PURE__ */ e(
        "input",
        {
          type: "email",
          className: i,
          placeholder: s.placeholder,
          value: r,
          onChange: (t) => o(t.target.value),
          required: s.required
        }
      );
    case "number":
      return /* @__PURE__ */ e(
        "input",
        {
          type: "number",
          className: i,
          placeholder: s.placeholder,
          value: r,
          onChange: (t) => o(t.target.value),
          required: s.required
        }
      );
    case "select":
      return /* @__PURE__ */ l(
        "select",
        {
          className: i,
          value: r,
          onChange: (t) => o(t.target.value),
          required: s.required,
          children: [
            /* @__PURE__ */ e("option", { value: "", children: "-- Select an option --" }),
            N(s.options).map((t) => /* @__PURE__ */ e("option", { value: t, children: t }, t))
          ]
        }
      );
    case "radio":
      return /* @__PURE__ */ e("div", {
        className: "space-y-2", children: N(s.options).map((t) => /* @__PURE__ */ l(
          "label",
          {
            className: "flex items-center gap-2 text-sm text-slate-700",
            children: [
            /* @__PURE__ */ e(
              "input",
              {
                type: "radio",
                name: s.name,
                value: t,
                checked: r === t,
                onChange: (m) => o(m.target.value)
              }
            ),
              t
            ]
          },
          t
        ))
      });
    case "checkbox":
      return /* @__PURE__ */ e("div", {
        className: "space-y-2", children: N(s.options).map((t) => /* @__PURE__ */ l(
          "label",
          {
            className: "flex items-center gap-2 text-sm text-slate-700",
            children: [
            /* @__PURE__ */ e(
              "input",
              {
                type: "checkbox",
                value: t,
                checked: Array.isArray(r) && r.includes(t),
                onChange: (m) => {
                  const c = Array.isArray(r) ? [...r] : [];
                  m.target.checked ? c.push(t) : c.splice(c.indexOf(t), 1), o(c);
                }
              }
            ),
              t
            ]
          },
          t
        ))
      });
    default:
      return null;
  }
}
function B({ appId: s, apiKey: r, apiBaseUrl: o, userInfo: i }) {
  const t = o ?? H, [m, c] = h(!1), [x, T] = h([]), [g, w] = h({}), [b, k] = h(!1), [f, F] = h(!1), [A, y] = h(null), [S, q] = h(!1), d = x.find((a) => a.isActive);
  D(() => {
    m && x.length === 0 && !b && E();
  }, [m, x.length, b]);
  async function E() {
    k(!0), y(null);
    try {
      const a = await fetch(`${t}/api/v1/apps/${s}/forms`, {
        headers: {
          "x-api-key": r
        }
      });
      if (!a.ok)
        throw new Error(`Failed to fetch forms: ${a.status}`);
      const n = await a.json();
      T(n.forms || []);
      const u = (n.forms || []).find((v) => v.isActive);
      u && C(u);
    } catch (a) {
      y(a instanceof Error ? a.message : "Failed to load forms");
    } finally {
      k(!1);
    }
  }
  function C(a) {
    const n = {};
    a.fields.forEach((u) => {
      n[u.name] = u.fieldType === "checkbox" ? [] : "";
    }), w(n);
  }
  async function j() {
    if (!d) return;
    F(!0), y(null);
    const a = (/* @__PURE__ */ new Date()).toISOString(), n = window.innerWidth, u = window.innerHeight, v = navigator.language, z = Intl.DateTimeFormat().resolvedOptions().timeZone, L = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: a,
      screenWidth: n,
      screenHeight: u,
      language: v,
      timezone: z,
      formData: g
    }, U = {
      appId: s,
      userInfo: i,
      module: d.name,
      description: d.description || "",
      impactLevel: "JUST_ANNOYING",
      metadata: L
    };
    try {
      const p = await fetch(`${t}/api/v1/report`, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": r
        },
        body: JSON.stringify(U)
      });
      if (!p.ok) {
        const V = await p.text();
        throw new Error(V || `Request failed: ${p.status}`);
      }
      q(!0), setTimeout(() => {
        c(!1), q(!1), d && C(d);
      }, 2e3);
    } catch (p) {
      y(p instanceof Error ? p.message : "Failed to send feedback");
    } finally {
      F(!1);
    }
  }
  const $ = d && d.fields.filter((a) => a.required).every((a) => {
    const n = g[a.name];
    return n && (Array.isArray(n) ? n.length > 0 : String(n).trim().length > 0);
  });
  return /* @__PURE__ */ l(O, {
    children: [
    /* @__PURE__ */ e(
      "button",
      {
        type: "button",
        className: "fixed bottom-6 right-6 z-[9999] rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow disabled:opacity-50",
        onClick: () => c(!0),
        children: "Send Feedback"
      }
    ),
      m && /* @__PURE__ */ l("div", {
        className: "fixed inset-0 z-[9999]", children: [
      /* @__PURE__ */ e(
          "div",
          {
            className: "absolute inset-0 bg-black/40",
            onClick: () => f ? null : c(!1)
          }
        ),
      /* @__PURE__ */ l("div", {
          className: "relative mx-auto mt-24 w-[92vw] max-w-lg rounded-lg bg-white p-5 shadow", children: [
        /* @__PURE__ */ l("div", {
            className: "flex items-start justify-between gap-3", children: [
          /* @__PURE__ */ l("div", {
              children: [
            /* @__PURE__ */ e("div", { className: "text-base font-semibold text-slate-900", children: "Send Feedback" }),
            /* @__PURE__ */ e("div", { className: "mt-0.5 text-sm text-slate-600", children: "Help us improve your experience." })
              ]
            }),
          /* @__PURE__ */ e(
              "button",
              {
                type: "button",
                className: "rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-50",
                onClick: () => f ? null : c(!1),
                children: "Close"
              }
            )
            ]
          }),
            A && /* @__PURE__ */ e("div", { className: "mt-4 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700", children: A }),
            S && /* @__PURE__ */ e("div", { className: "mt-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700", children: "Thank you for your feedback!" }),
            b && /* @__PURE__ */ e("div", { className: "mt-4 text-sm text-slate-600", children: "Loading forms..." }),
            !b && x.length === 0 && /* @__PURE__ */ e("div", { className: "mt-4 text-sm text-slate-600", children: "No forms available." }),
            !b && x.length > 0 && d && /* @__PURE__ */ l(O, {
              children: [
                i?.email && /* @__PURE__ */ l("div", {
                  className: "mt-4", children: [
            /* @__PURE__ */ e("label", { className: "text-sm font-medium text-slate-900", children: "Email" }),
            /* @__PURE__ */ e("div", { className: "mt-2 text-sm text-slate-600", children: i.email })
                  ]
                }),
                i?.name && /* @__PURE__ */ l("div", {
                  className: "mt-4", children: [
            /* @__PURE__ */ e("label", { className: "text-sm font-medium text-slate-900", children: "Name" }),
            /* @__PURE__ */ e("div", { className: "mt-2 text-sm text-slate-600", children: i.name })
                  ]
                }),
                d.fields.map((a) => /* @__PURE__ */ l("div", {
                  className: "mt-4", children: [
            /* @__PURE__ */ l("label", {
                    className: "text-sm font-medium text-slate-900", children: [
                      a.label,
                      a.required && /* @__PURE__ */ e("span", { className: "text-rose-600", children: "*" })
                    ]
                  }),
            /* @__PURE__ */ e("div", {
                    className: "mt-2", children: /* @__PURE__ */ e(
                      J,
                      {
                        field: a,
                        value: g[a.name] || (a.fieldType === "checkbox" ? [] : ""),
                        onChange: (n) => w({
                          ...g,
                          [a.name]: n
                        })
                      }
                    )
                  })
                  ]
                }, a.id)),
          /* @__PURE__ */ l("div", {
                  className: "mt-5 flex items-center justify-end gap-2", children: [
            /* @__PURE__ */ e(
                    "button",
                    {
                      type: "button",
                      className: "rounded border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50",
                      onClick: () => c(!1),
                      disabled: f,
                      children: "Cancel"
                    }
                  ),
            /* @__PURE__ */ e(
                    "button",
                    {
                      type: "button",
                      className: "rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50",
                      onClick: j,
                      disabled: f || !$ || S,
                      children: f ? "Sending…" : "Send"
                    }
                  )
                  ]
                }),
          /* @__PURE__ */ e("div", { className: "mt-3 text-xs text-slate-500", children: "Auto-captured: URL, user-agent, timestamp, device info." })
              ]
            })
          ]
        })
        ]
      })
    ]
  });
}
export {
  B as FeedbackWidget
};