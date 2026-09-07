import { jsxs as o, Fragment as I, jsx as n } from "react/jsx-runtime";
import { useRef as L, useState as f, useCallback as Z, useEffect as E } from "react";
const U = "feedback-widget-position", K = "https://thebridgeserver-production-fc18.up.railway.app";
function T(s) {
  if (Array.isArray(s))
    return s;
  if (typeof s == "string")
    try {
      const i = JSON.parse(s);
      return Array.isArray(i) ? i : [];
    } catch {
      return [];
    }
  return [];
}
function Q({
  field: s,
  value: i,
  onChange: l
}) {
  const c = "w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400";
  switch (s.fieldType) {
    case "text":
      return /* @__PURE__ */ n(
        "input",
        {
          type: "text",
          className: c,
          placeholder: s.placeholder,
          value: i,
          onChange: (r) => l(r.target.value),
          required: s.required
        }
      );
    case "textarea":
      return /* @__PURE__ */ n(
        "textarea",
        {
          className: `${c} min-h-24 resize-y`,
          placeholder: s.placeholder,
          value: i,
          onChange: (r) => l(r.target.value),
          required: s.required
        }
      );
    case "email":
      return /* @__PURE__ */ n(
        "input",
        {
          type: "email",
          className: c,
          placeholder: s.placeholder,
          value: i,
          onChange: (r) => l(r.target.value),
          required: s.required
        }
      );
    case "number":
      return /* @__PURE__ */ n(
        "input",
        {
          type: "number",
          className: c,
          placeholder: s.placeholder,
          value: i,
          onChange: (r) => l(r.target.value),
          required: s.required
        }
      );
    case "select":
      return /* @__PURE__ */ o(
        "select",
        {
          className: c,
          value: i,
          onChange: (r) => l(r.target.value),
          required: s.required,
          children: [
            /* @__PURE__ */ n("option", { value: "", children: "-- Select an option --" }),
            T(s.options).map((r) => /* @__PURE__ */ n("option", { value: r, children: r }, r))
          ]
        }
      );
    case "radio":
      return /* @__PURE__ */ n("div", {
        className: "space-y-2", children: T(s.options).map((r) => /* @__PURE__ */ o(
          "label",
          {
            className: "flex items-center gap-2 text-sm text-slate-700",
            children: [
            /* @__PURE__ */ n(
              "input",
              {
                type: "radio",
                name: s.name,
                value: r,
                checked: i === r,
                onChange: (p) => l(p.target.value)
              }
            ),
              r
            ]
          },
          r
        ))
      });
    case "checkbox":
      return /* @__PURE__ */ n("div", {
        className: "space-y-2", children: T(s.options).map((r) => /* @__PURE__ */ o(
          "label",
          {
            className: "flex items-center gap-2 text-sm text-slate-700",
            children: [
            /* @__PURE__ */ n(
              "input",
              {
                type: "checkbox",
                value: r,
                checked: Array.isArray(i) && i.includes(r),
                onChange: (p) => {
                  const x = Array.isArray(i) ? [...i] : [];
                  p.target.checked ? x.push(r) : x.splice(x.indexOf(r), 1), l(x);
                }
              }
            ),
              r
            ]
          },
          r
        ))
      });
    default:
      return null;
  }
}
function re({
  appId: s,
  apiKey: i,
  apiBaseUrl: l,
  userInfo: c,
  draggable: r = !0,
  persistPosition: p = !0
}) {
  const x = l ?? K, w = L(null), [N, k] = f(null), S = L({
    isDragging: !1,
    hasMoved: !1,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0
  }), F = Z((t, e) => {
    const a = w.current, m = a?.offsetWidth ?? 140, O = a?.offsetHeight ?? 44, u = 8, q = Math.max(window.innerWidth - m - u, u), h = Math.max(window.innerHeight - O - u, u);
    return {
      x: Math.min(Math.max(t, u), q),
      y: Math.min(Math.max(e, u), h)
    };
  }, []);
  E(() => {
    if (!(!r || !p))
      try {
        const t = window.localStorage.getItem(U);
        if (t) {
          const e = JSON.parse(t);
          typeof e.x == "number" && typeof e.y == "number" && k(F(e.x, e.y));
        }
      } catch {
      }
  }, [r, p]), E(() => {
    if (!r) return;
    function t() {
      k((e) => e && F(e.x, e.y));
    }
    return window.addEventListener("resize", t), () => window.removeEventListener("resize", t);
  }, [r, F]);
  function $(t) {
    if (!r) return;
    const e = w.current;
    if (!e) return;
    const a = e.getBoundingClientRect();
    S.current = {
      isDragging: !0,
      hasMoved: !1,
      startX: t.clientX,
      startY: t.clientY,
      originX: a.left,
      originY: a.top
    }, e.setPointerCapture(t.pointerId);
  }
  function H(t) {
    if (!r) return;
    const e = S.current;
    if (!e.isDragging) return;
    const a = t.clientX - e.startX, m = t.clientY - e.startY;
    !e.hasMoved && Math.hypot(a, m) > 4 && (e.hasMoved = !0), e.hasMoved && k(F(e.originX + a, e.originY + m));
  }
  function J(t) {
    if (!r) return;
    const e = S.current;
    if (e.isDragging) {
      e.isDragging = !1;
      try {
        w.current?.releasePointerCapture(t.pointerId);
      } catch {
      }
      e.hasMoved && p && k((a) => {
        if (a)
          try {
            window.localStorage.setItem(
              U,
              JSON.stringify(a)
            );
          } catch {
          }
        return a;
      });
    }
  }
  const [C, g] = f(!1), [y, V] = f([]), [A, Y] = f({}), [b, D] = f(!1), [v, P] = f(!1), [X, M] = f(null), [z, R] = f(!1), d = y.find((t) => t.isActive);
  E(() => {
    C && y.length === 0 && !b && W();
  }, [C, y.length, b]);
  async function W() {
    D(!0), M(null);
    try {
      const t = await fetch(`${x}/api/v1/apps/${s}/forms`, {
        headers: {
          "x-api-key": i
        }
      });
      if (!t.ok)
        throw new Error(`Failed to fetch forms: ${t.status}`);
      const e = await t.json();
      V(e.forms || []);
      const a = (e.forms || []).find((m) => m.isActive);
      a && j(a);
    } catch (t) {
      M(t instanceof Error ? t.message : "Failed to load forms");
    } finally {
      D(!1);
    }
  }
  function j(t) {
    const e = {};
    t.fields.forEach((a) => {
      e[a.name] = a.fieldType === "checkbox" ? [] : "";
    }), Y(e);
  }
  async function _() {
    if (!d) return;
    P(!0), M(null);
    const t = (/* @__PURE__ */ new Date()).toISOString(), e = window.innerWidth, a = window.innerHeight, m = navigator.language, O = Intl.DateTimeFormat().resolvedOptions().timeZone, u = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: t,
      screenWidth: e,
      screenHeight: a,
      language: m,
      timezone: O,
      formData: A
    }, q = {
      appId: s,
      userInfo: c,
      module: d.name,
      description: d.description || "",
      impactLevel: "JUST_ANNOYING",
      metadata: u
    };
    try {
      const h = await fetch(`${x}/api/v1/report`, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": i
        },
        body: JSON.stringify(q)
      });
      if (!h.ok) {
        const G = await h.text();
        throw new Error(G || `Request failed: ${h.status}`);
      }
      R(!0), setTimeout(() => {
        g(!1), R(!1), d && j(d);
      }, 2e3);
    } catch (h) {
      M(h instanceof Error ? h.message : "Failed to send feedback");
    } finally {
      P(!1);
    }
  }
  const B = d && d.fields.filter((t) => t.required).every((t) => {
    const e = A[t.name];
    return e && (Array.isArray(e) ? e.length > 0 : String(e).trim().length > 0);
  });
  return /* @__PURE__ */ o(I, {
    children: [
    /* @__PURE__ */ n(
      "button",
      {
        ref: w,
        type: "button",
        className: "fixed z-[9999] rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow disabled:opacity-50" + (N ? "" : " bottom-6 right-6") + (r ? " cursor-grab touch-none select-none active:cursor-grabbing" : ""),
        style: N ? { left: N.x, top: N.y } : void 0,
        onPointerDown: $,
        onPointerMove: H,
        onPointerUp: J,
        onClick: () => {
          S.current.hasMoved || g(!0);
        },
        children: "Send Feedback"
      }
    ),
      C && /* @__PURE__ */ o("div", {
        className: "fixed inset-0 z-[9999]", children: [
      /* @__PURE__ */ n(
          "div",
          {
            className: "absolute inset-0 bg-black/40",
            onClick: () => v ? null : g(!1)
          }
        ),
      /* @__PURE__ */ o("div", {
          className: "relative mx-auto mt-24 w-[92vw] max-w-lg rounded-lg bg-white p-5 shadow", children: [
        /* @__PURE__ */ o("div", {
            className: "flex items-start justify-between gap-3", children: [
          /* @__PURE__ */ o("div", {
              children: [
            /* @__PURE__ */ n("div", { className: "text-base font-semibold text-slate-900", children: "Send Feedback" }),
            /* @__PURE__ */ n("div", { className: "mt-0.5 text-sm text-slate-600", children: "Help us improve your experience." })
              ]
            }),
          /* @__PURE__ */ n(
              "button",
              {
                type: "button",
                className: "rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-50",
                onClick: () => v ? null : g(!1),
                children: "Close"
              }
            )
            ]
          }),
            X && /* @__PURE__ */ n("div", { className: "mt-4 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700", children: X }),
            z && /* @__PURE__ */ n("div", { className: "mt-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700", children: "Thank you for your feedback!" }),
            b && /* @__PURE__ */ n("div", { className: "mt-4 text-sm text-slate-600", children: "Loading forms..." }),
            !b && y.length === 0 && /* @__PURE__ */ n("div", { className: "mt-4 text-sm text-slate-600", children: "No forms available." }),
            !b && y.length > 0 && d && /* @__PURE__ */ o(I, {
              children: [
                c?.email && /* @__PURE__ */ o("div", {
                  className: "mt-4", children: [
            /* @__PURE__ */ n("label", { className: "text-sm font-medium text-slate-900", children: "Email" }),
            /* @__PURE__ */ n("div", { className: "mt-2 text-sm text-slate-600", children: c.email })
                  ]
                }),
                c?.name && /* @__PURE__ */ o("div", {
                  className: "mt-4", children: [
            /* @__PURE__ */ n("label", { className: "text-sm font-medium text-slate-900", children: "Name" }),
            /* @__PURE__ */ n("div", { className: "mt-2 text-sm text-slate-600", children: c.name })
                  ]
                }),
                d.fields.map((t) => /* @__PURE__ */ o("div", {
                  className: "mt-4", children: [
            /* @__PURE__ */ o("label", {
                    className: "text-sm font-medium text-slate-900", children: [
                      t.label,
                      t.required && /* @__PURE__ */ n("span", { className: "text-rose-600", children: "*" })
                    ]
                  }),
            /* @__PURE__ */ n("div", {
                    className: "mt-2", children: /* @__PURE__ */ n(
                      Q,
                      {
                        field: t,
                        value: A[t.name] || (t.fieldType === "checkbox" ? [] : ""),
                        onChange: (e) => Y({
                          ...A,
                          [t.name]: e
                        })
                      }
                    )
                  })
                  ]
                }, t.id)),
          /* @__PURE__ */ o("div", {
                  className: "mt-5 flex items-center justify-end gap-2", children: [
            /* @__PURE__ */ n(
                    "button",
                    {
                      type: "button",
                      className: "rounded border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50",
                      onClick: () => g(!1),
                      disabled: v,
                      children: "Cancel"
                    }
                  ),
            /* @__PURE__ */ n(
                    "button",
                    {
                      type: "button",
                      className: "rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50",
                      onClick: _,
                      disabled: v || !B || z,
                      children: v ? "Sending…" : "Send"
                    }
                  )
                  ]
                }),
          /* @__PURE__ */ n("div", { className: "mt-3 text-xs text-slate-500", children: "Auto-captured: URL, user-agent, timestamp, device info." })
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
  re as FeedbackWidget
};