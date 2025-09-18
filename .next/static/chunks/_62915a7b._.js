(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/components/user/user-dashboard-layout.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "UserDashboardLayout",
    ()=>UserDashboardLayout
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.3_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.3_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.3_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
const navItems = [
    {
        id: 'dashboard',
        title: 'Dashboard',
        icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
            className: "w-5 h-5",
            fill: "none",
            stroke: "currentColor",
            viewBox: "0 0 24 24",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeWidth: 2,
                d: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            }, void 0, false, {
                fileName: "[project]/components/user/user-dashboard-layout.tsx",
                lineNumber: 22,
                columnNumber: 90
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/components/user/user-dashboard-layout.tsx",
            lineNumber: 22,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0)),
        href: '/user/dashboard'
    },
    {
        id: 'discover',
        title: 'Discover',
        icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
            className: "w-5 h-5",
            fill: "none",
            stroke: "currentColor",
            viewBox: "0 0 24 24",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeWidth: 2,
                d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            }, void 0, false, {
                fileName: "[project]/components/user/user-dashboard-layout.tsx",
                lineNumber: 28,
                columnNumber: 90
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/components/user/user-dashboard-layout.tsx",
            lineNumber: 28,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0)),
        href: '/user/discover'
    },
    {
        id: 'offers',
        title: 'Offers',
        icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
            className: "w-5 h-5",
            fill: "none",
            stroke: "currentColor",
            viewBox: "0 0 24 24",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeWidth: 2,
                d: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            }, void 0, false, {
                fileName: "[project]/components/user/user-dashboard-layout.tsx",
                lineNumber: 34,
                columnNumber: 90
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/components/user/user-dashboard-layout.tsx",
            lineNumber: 34,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0)),
        href: '/user/offers'
    },
    {
        id: 'secret-menu',
        title: 'Secret Menu Club',
        icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
            className: "w-5 h-5",
            fill: "none",
            stroke: "currentColor",
            viewBox: "0 0 24 24",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeWidth: 2,
                d: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            }, void 0, false, {
                fileName: "[project]/components/user/user-dashboard-layout.tsx",
                lineNumber: 40,
                columnNumber: 90
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/components/user/user-dashboard-layout.tsx",
            lineNumber: 40,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0)),
        href: '/user/secret-menu'
    },
    {
        id: 'chat',
        title: 'AI Chat',
        icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
            className: "w-5 h-5",
            fill: "none",
            stroke: "currentColor",
            viewBox: "0 0 24 24",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeWidth: 2,
                d: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            }, void 0, false, {
                fileName: "[project]/components/user/user-dashboard-layout.tsx",
                lineNumber: 46,
                columnNumber: 90
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/components/user/user-dashboard-layout.tsx",
            lineNumber: 46,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0)),
        href: '/user/chat'
    },
    {
        id: 'credits',
        title: 'Qwikker Credits',
        icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
            className: "w-5 h-5",
            fill: "none",
            stroke: "currentColor",
            viewBox: "0 0 24 24",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeWidth: 2,
                d: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
            }, void 0, false, {
                fileName: "[project]/components/user/user-dashboard-layout.tsx",
                lineNumber: 52,
                columnNumber: 90
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/components/user/user-dashboard-layout.tsx",
            lineNumber: 52,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0)),
        href: '/user/credits'
    },
    {
        id: 'how-it-works',
        title: 'How It Works',
        icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
            className: "w-5 h-5",
            fill: "none",
            stroke: "currentColor",
            viewBox: "0 0 24 24",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeWidth: 2,
                d: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            }, void 0, false, {
                fileName: "[project]/components/user/user-dashboard-layout.tsx",
                lineNumber: 58,
                columnNumber: 90
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/components/user/user-dashboard-layout.tsx",
            lineNumber: 58,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0)),
        href: '/user/how-it-works'
    },
    {
        id: 'settings',
        title: 'Settings',
        icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
            className: "w-5 h-5",
            fill: "none",
            stroke: "currentColor",
            viewBox: "0 0 24 24",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    strokeWidth: 2,
                    d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                }, void 0, false, {
                    fileName: "[project]/components/user/user-dashboard-layout.tsx",
                    lineNumber: 64,
                    columnNumber: 90
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    strokeWidth: 2,
                    d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                }, void 0, false, {
                    fileName: "[project]/components/user/user-dashboard-layout.tsx",
                    lineNumber: 64,
                    columnNumber: 647
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/components/user/user-dashboard-layout.tsx",
            lineNumber: 64,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0)),
        href: '/user/settings'
    }
];
function UserDashboardLayout(param) {
    let { children, currentSection } = param;
    _s();
    const [sidebarOpen, setSidebarOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-slate-950 text-slate-100",
        children: [
            sidebarOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden",
                onClick: ()=>setSidebarOpen(false)
            }, void 0, false, {
                fileName: "[project]/components/user/user-dashboard-layout.tsx",
                lineNumber: 76,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "sidebar-locked inset-y-0 left-0 w-80 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 transform transition-transform duration-300 z-50 flex flex-col ".concat(sidebarOpen ? 'translate-x-0' : '-translate-x-full', " lg:translate-x-0"),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-shrink-0 p-6 border-b border-slate-800",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "text-center space-y-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                    src: "/Qwikker Logo web.svg",
                                    alt: "QWIKKER User Dashboard",
                                    className: "h-8 w-auto sm:h-10 mx-auto"
                                }, void 0, false, {
                                    fileName: "[project]/components/user/user-dashboard-layout.tsx",
                                    lineNumber: 91,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-sm text-slate-400 font-medium",
                                    children: "Discover Local Businesses"
                                }, void 0, false, {
                                    fileName: "[project]/components/user/user-dashboard-layout.tsx",
                                    lineNumber: 97,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/user/user-dashboard-layout.tsx",
                            lineNumber: 89,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/user/user-dashboard-layout.tsx",
                        lineNumber: 88,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                        className: "flex-1 overflow-y-scroll overflow-x-hidden scrollbar-hidden p-4 space-y-2",
                        style: {
                            touchAction: 'pan-y',
                            overscrollBehavior: 'contain'
                        },
                        children: navItems.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: item.href,
                                className: "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ".concat(currentSection === item.id ? 'bg-gradient-to-r from-[#00d083]/20 to-[#00b86f]/20 border border-[#00d083]/30 text-[#00d083]' : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100'),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: currentSection === item.id ? "text-[#00d083]" : "text-slate-400",
                                        children: item.icon
                                    }, void 0, false, {
                                        fileName: "[project]/components/user/user-dashboard-layout.tsx",
                                        lineNumber: 117,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "flex-1",
                                        children: item.title
                                    }, void 0, false, {
                                        fileName: "[project]/components/user/user-dashboard-layout.tsx",
                                        lineNumber: 118,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, item.id, true, {
                                fileName: "[project]/components/user/user-dashboard-layout.tsx",
                                lineNumber: 108,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/components/user/user-dashboard-layout.tsx",
                        lineNumber: 102,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-shrink-0 p-4 border-t border-slate-800",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "w-10 h-10 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-full flex items-center justify-center font-semibold text-black",
                                    children: "D"
                                }, void 0, false, {
                                    fileName: "[project]/components/user/user-dashboard-layout.tsx",
                                    lineNumber: 126,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "font-semibold text-slate-100",
                                            children: "David"
                                        }, void 0, false, {
                                            fileName: "[project]/components/user/user-dashboard-layout.tsx",
                                            lineNumber: 130,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm text-slate-400",
                                            children: "Bournemouth Explorer"
                                        }, void 0, false, {
                                            fileName: "[project]/components/user/user-dashboard-layout.tsx",
                                            lineNumber: 131,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/user/user-dashboard-layout.tsx",
                                    lineNumber: 129,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/user/user-dashboard-layout.tsx",
                            lineNumber: 125,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/user/user-dashboard-layout.tsx",
                        lineNumber: 124,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/user/user-dashboard-layout.tsx",
                lineNumber: 83,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "lg:ml-80",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                        className: "bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-6 py-4",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center justify-between",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>setSidebarOpen(true),
                                            className: "lg:hidden p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                className: "w-5 h-5",
                                                fill: "none",
                                                stroke: "currentColor",
                                                viewBox: "0 0 24 24",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                    strokeLinecap: "round",
                                                    strokeLinejoin: "round",
                                                    strokeWidth: 2,
                                                    d: "M4 6h16M4 12h16M4 18h16"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/user/user-dashboard-layout.tsx",
                                                    lineNumber: 149,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/user/user-dashboard-layout.tsx",
                                                lineNumber: 148,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/components/user/user-dashboard-layout.tsx",
                                            lineNumber: 144,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "hidden lg:block",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                                className: "text-lg font-semibold text-slate-100 capitalize",
                                                children: currentSection === 'secret-menu' ? 'Secret Menu Club' : currentSection === 'credits' ? 'Qwikker Credits' : currentSection
                                            }, void 0, false, {
                                                fileName: "[project]/components/user/user-dashboard-layout.tsx",
                                                lineNumber: 154,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/components/user/user-dashboard-layout.tsx",
                                            lineNumber: 153,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/user/user-dashboard-layout.tsx",
                                    lineNumber: 143,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-right",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "font-semibold text-slate-100",
                                                    children: "Bournemouth"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/user/user-dashboard-layout.tsx",
                                                    lineNumber: 165,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-sm text-slate-400",
                                                    children: "Current City"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/user/user-dashboard-layout.tsx",
                                                    lineNumber: 166,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/user/user-dashboard-layout.tsx",
                                            lineNumber: 164,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center font-semibold text-slate-100",
                                            children: "B"
                                        }, void 0, false, {
                                            fileName: "[project]/components/user/user-dashboard-layout.tsx",
                                            lineNumber: 170,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/user/user-dashboard-layout.tsx",
                                    lineNumber: 163,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/user/user-dashboard-layout.tsx",
                            lineNumber: 141,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/user/user-dashboard-layout.tsx",
                        lineNumber: 140,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                        className: "p-6",
                        children: children
                    }, void 0, false, {
                        fileName: "[project]/components/user/user-dashboard-layout.tsx",
                        lineNumber: 178,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/user/user-dashboard-layout.tsx",
                lineNumber: 138,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/user/user-dashboard-layout.tsx",
        lineNumber: 73,
        columnNumber: 5
    }, this);
}
_s(UserDashboardLayout, "5rGDkYpGQ8fHM9RkMWnKOwsxadk=");
_c = UserDashboardLayout;
var _c;
__turbopack_context__.k.register(_c, "UserDashboardLayout");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/utils.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$tailwind$2d$merge$40$3$2e$3$2e$1$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/tailwind-merge@3.3.1/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-client] (ecmascript)");
;
;
function cn() {
    for(var _len = arguments.length, inputs = new Array(_len), _key = 0; _key < _len; _key++){
        inputs[_key] = arguments[_key];
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$tailwind$2d$merge$40$3$2e$3$2e$1$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ui/card.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Card",
    ()=>Card,
    "CardAction",
    ()=>CardAction,
    "CardContent",
    ()=>CardContent,
    "CardDescription",
    ()=>CardDescription,
    "CardFooter",
    ()=>CardFooter,
    "CardHeader",
    ()=>CardHeader,
    "CardTitle",
    ()=>CardTitle
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.3_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
;
function Card(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "card",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/card.tsx",
        lineNumber: 7,
        columnNumber: 5
    }, this);
}
_c = Card;
function CardHeader(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "card-header",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/card.tsx",
        lineNumber: 20,
        columnNumber: 5
    }, this);
}
_c1 = CardHeader;
function CardTitle(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "card-title",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("leading-none font-semibold", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/card.tsx",
        lineNumber: 33,
        columnNumber: 5
    }, this);
}
_c2 = CardTitle;
function CardDescription(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "card-description",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-muted-foreground text-sm", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/card.tsx",
        lineNumber: 43,
        columnNumber: 5
    }, this);
}
_c3 = CardDescription;
function CardAction(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "card-action",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/card.tsx",
        lineNumber: 53,
        columnNumber: 5
    }, this);
}
_c4 = CardAction;
function CardContent(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "card-content",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-6", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/card.tsx",
        lineNumber: 66,
        columnNumber: 5
    }, this);
}
_c5 = CardContent;
function CardFooter(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "card-footer",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center px-6 [.border-t]:pt-6", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/card.tsx",
        lineNumber: 76,
        columnNumber: 5
    }, this);
}
_c6 = CardFooter;
;
var _c, _c1, _c2, _c3, _c4, _c5, _c6;
__turbopack_context__.k.register(_c, "Card");
__turbopack_context__.k.register(_c1, "CardHeader");
__turbopack_context__.k.register(_c2, "CardTitle");
__turbopack_context__.k.register(_c3, "CardDescription");
__turbopack_context__.k.register(_c4, "CardAction");
__turbopack_context__.k.register(_c5, "CardContent");
__turbopack_context__.k.register(_c6, "CardFooter");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ui/button.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Button",
    ()=>Button,
    "buttonVariants",
    ()=>buttonVariants
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.3_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$radix$2d$ui$2b$react$2d$slot$40$1$2e$2$2e$3_$40$types$2b$react$40$19$2e$1$2e$13_react$40$19$2e$1$2e$0$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@radix-ui+react-slot@1.2.3_@types+react@19.1.13_react@19.1.0/node_modules/@radix-ui/react-slot/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$class$2d$variance$2d$authority$40$0$2e$7$2e$1$2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/class-variance-authority@0.7.1/node_modules/class-variance-authority/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-client] (ecmascript)");
;
;
;
;
const buttonVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$class$2d$variance$2d$authority$40$0$2e$7$2e$1$2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cva"])("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive", {
    variants: {
        variant: {
            default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
            destructive: "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
            outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
            secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
            ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
            link: "text-primary underline-offset-4 hover:underline"
        },
        size: {
            default: "h-9 px-4 py-2 has-[>svg]:px-3",
            sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
            lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
            icon: "size-9"
        }
    },
    defaultVariants: {
        variant: "default",
        size: "default"
    }
});
function Button(param) {
    let { className, variant, size, asChild = false, ...props } = param;
    const Comp = asChild ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$radix$2d$ui$2b$react$2d$slot$40$1$2e$2$2e$3_$40$types$2b$react$40$19$2e$1$2e$13_react$40$19$2e$1$2e$0$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Slot"] : "button";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Comp, {
        "data-slot": "button",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(buttonVariants({
            variant,
            size,
            className
        })),
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/button.tsx",
        lineNumber: 51,
        columnNumber: 5
    }, this);
}
_c = Button;
;
var _c;
__turbopack_context__.k.register(_c, "Button");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/mock-data/user-mock-data.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Mock data for user dashboard - Phase 1 UI shell
// Gamification System Interfaces
__turbopack_context__.s([
    "enhancedSecretMenus",
    ()=>enhancedSecretMenus,
    "levelSystem",
    ()=>levelSystem,
    "mockBadges",
    ()=>mockBadges,
    "mockBusinessAnalytics",
    ()=>mockBusinessAnalytics,
    "mockBusinesses",
    ()=>mockBusinesses,
    "mockClaimedOffers",
    ()=>mockClaimedOffers,
    "mockOffers",
    ()=>mockOffers,
    "mockPointsHistory",
    ()=>mockPointsHistory,
    "mockSecretMenus",
    ()=>mockSecretMenus,
    "mockUserCredits",
    ()=>mockUserCredits,
    "mockUserProfile",
    ()=>mockUserProfile,
    "pointsEarningRules",
    ()=>pointsEarningRules,
    "suggestedPrompts",
    ()=>suggestedPrompts
]);
const mockBusinesses = [
    // QWIKKER PICKS (top tier)
    {
        id: '1',
        name: 'The Seaside Bistro',
        slug: 'seaside-bistro',
        tagline: 'Fresh seafood with ocean views',
        description: 'Located right on Bournemouth Pier, The Seaside Bistro offers the finest fresh seafood with breathtaking ocean views. Our chefs work closely with local fishermen to bring you the catch of the day, prepared with Mediterranean flair. Whether you\'re enjoying our famous fish & chips on the terrace or indulging in our premium seafood platter, every meal comes with the sound of waves and the salty sea breeze.',
        address: '15 Pier Approach',
        town: 'Bournemouth',
        hours: '12pm - 10pm',
        images: [
            'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop&crop=center'
        ],
        tier: 'qwikker_picks',
        category: 'Restaurant',
        rating: 4.8,
        reviewCount: 127,
        distance: 0.3,
        menuPreview: [
            'Fish & Chips £14',
            'Seafood Platter £22',
            'Crab Cakes £16'
        ],
        hasSecretMenu: true,
        activeOffers: 2,
        offerIds: [
            '1',
            '4'
        ] // 2-for-1 Fish & Chips, Free Dessert with Main Course
    },
    {
        id: '2',
        name: 'Artisan Coffee Co.',
        slug: 'artisan-coffee',
        tagline: 'Locally roasted, ethically sourced',
        description: 'A cozy independent coffee shop in the heart of Bournemouth, Artisan Coffee Co. roasts their beans in-house every morning. We source directly from sustainable farms around the world and serve specialty coffee alongside freshly baked pastries. Our warm, welcoming atmosphere makes it the perfect spot for remote work, catching up with friends, or simply enjoying a moment of peace with exceptional coffee.',
        address: '42 Old Christchurch Rd',
        town: 'Bournemouth',
        hours: '7am - 6pm',
        images: [
            'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop&crop=center'
        ],
        tier: 'qwikker_picks',
        category: 'Cafe',
        rating: 4.9,
        reviewCount: 89,
        distance: 0.5,
        menuPreview: [
            'Flat White £3.20',
            'Avocado Toast £7.50',
            'Pastries from £2.80'
        ],
        hasSecretMenu: true,
        activeOffers: 2,
        offerIds: [
            '2',
            '6'
        ] // Free Pastry with Coffee, 25% off Coffee Beans
    },
    // FEATURED (mid tier)
    {
        id: '3',
        name: 'Zen Wellness Spa',
        slug: 'zen-wellness',
        tagline: 'Relaxation and rejuvenation',
        description: 'Escape the hustle and bustle at Zen Wellness Spa, Bournemouth\'s premier destination for holistic wellness. Our expert therapists offer a range of treatments from traditional massages to cutting-edge facial therapies, all in a serene environment designed to restore your mind, body, and spirit. Using only premium organic products, we create a sanctuary where stress melts away and inner peace is rediscovered.',
        address: '8 Westover Rd',
        town: 'Bournemouth',
        hours: '9am - 8pm',
        images: [
            'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&h=300&fit=crop&crop=center'
        ],
        tier: 'featured',
        category: 'Spa',
        rating: 4.6,
        reviewCount: 203,
        distance: 0.8,
        menuPreview: [
            'Massage £45',
            'Facial £35',
            'Full Day Package £120'
        ],
        hasSecretMenu: false,
        activeOffers: 1,
        offerIds: [
            '5'
        ] // Buy 2 Get 1 Free Treatments
    },
    {
        id: '4',
        name: 'The Craft Brewery',
        slug: 'craft-brewery',
        tagline: 'Local ales and craft beers',
        description: 'The Craft Brewery is Bournemouth\'s favorite local brewing destination, featuring an impressive selection of house-brewed ales and carefully curated craft beers from around the UK. Our industrial-chic taproom offers the perfect atmosphere to sample our rotating selection of IPAs, stouts, and seasonal brews, paired with artisanal bar snacks. Join us for brewery tours, tasting flights, and live music nights.',
        address: '23 Richmond Hill',
        town: 'Bournemouth',
        hours: '4pm - 11pm',
        images: [
            'https://images.unsplash.com/photo-1436076863939-06870fe779c2?w=400&h=300&fit=crop&crop=center'
        ],
        tier: 'featured',
        category: 'Bar',
        rating: 4.5,
        reviewCount: 156,
        distance: 1.2,
        menuPreview: [
            'Pint £4.50',
            'Tasting Flight £12',
            'Bar Snacks £6-8'
        ],
        hasSecretMenu: true,
        activeOffers: 2,
        offerIds: [
            '3',
            '7'
        ] // 20% off Tasting Flights, Happy Hour: 2-for-1 Pints
    },
    // RECOMMENDED (base tier)
    {
        id: '5',
        name: 'Fitness First Gym',
        slug: 'fitness-first',
        tagline: 'Your fitness journey starts here',
        description: 'A state-of-the-art fitness facility in central Bournemouth, Fitness First Gym offers everything you need to achieve your health and fitness goals. With cutting-edge equipment, expert personal trainers, diverse group classes, and a welcoming community atmosphere, we cater to all fitness levels. From strength training and cardio to yoga and HIIT classes, your transformation starts here.',
        address: '156 Holdenhurst Rd',
        town: 'Bournemouth',
        hours: '6am - 10pm',
        images: [
            'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&crop=center'
        ],
        tier: 'recommended',
        category: 'Gym',
        rating: 4.5,
        reviewCount: 78,
        distance: 1.5,
        menuPreview: [
            'Day Pass £12',
            'Monthly £29',
            'Personal Training £35/hr'
        ],
        hasSecretMenu: false,
        activeOffers: 0,
        offerIds: [] // No current offers
    },
    {
        id: '6',
        name: 'Bella Vista Restaurant',
        slug: 'bella-vista',
        tagline: 'Authentic Italian cuisine',
        address: '67 Christchurch Rd',
        town: 'Bournemouth',
        hours: '5pm - 10pm',
        images: [
            'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop&crop=center'
        ],
        tier: 'recommended',
        category: 'Restaurant',
        rating: 4.6,
        reviewCount: 94,
        distance: 2.1,
        menuPreview: [
            'Pasta £12-16',
            'Pizza £10-14',
            'Wine from £18'
        ],
        hasSecretMenu: false,
        activeOffers: 1,
        offerIds: [
            '8'
        ] // 30% off Wine Selection
    }
];
const mockOffers = [
    {
        id: '1',
        businessId: '1',
        businessName: 'The Seaside Bistro',
        title: '2-for-1 Fish & Chips',
        description: 'Buy one fish & chips, get one free. Perfect for sharing!',
        value: 'Save £14',
        type: 'two_for_one',
        badge: '2-FOR-1',
        terms: 'Valid Mon-Thu only. One per table.',
        expiryDate: '2024-12-31',
        isPopular: true,
        isEndingSoon: false
    },
    {
        id: '2',
        businessId: '2',
        businessName: 'Artisan Coffee Co.',
        title: 'Free Pastry with Coffee',
        description: 'Get a free pastry when you buy any specialty coffee',
        value: 'Save up to £2.80',
        type: 'freebie',
        badge: 'FREE ITEM',
        terms: 'One per customer per day.',
        expiryDate: '2024-11-30',
        isPopular: false,
        isEndingSoon: true
    },
    {
        id: '3',
        businessId: '4',
        businessName: 'The Craft Brewery',
        title: '20% off Tasting Flights',
        description: 'Try 4 different craft beers at a special price',
        value: '20% OFF',
        type: 'percentage_off',
        badge: '20% OFF',
        terms: 'Available 4-7pm weekdays only.',
        expiryDate: '2024-12-15',
        isPopular: true,
        isEndingSoon: false
    },
    {
        id: '4',
        businessId: '1',
        businessName: 'The Seaside Bistro',
        title: 'Free Dessert with Main Course',
        description: 'Choose any dessert from our menu when you order a main course',
        value: 'Save up to £8',
        type: 'freebie',
        badge: 'FREE DESSERT',
        terms: 'Valid for dinner service only. One per person.',
        expiryDate: '2024-12-20',
        isPopular: true,
        isEndingSoon: false
    },
    {
        id: '5',
        businessId: '3',
        businessName: 'Zen Wellness Spa',
        title: 'Buy 2 Get 1 Free Treatments',
        description: 'Book any 2 treatments and get the 3rd one absolutely free',
        value: 'Save up to £45',
        type: 'buy_x_get_y',
        badge: 'BUY 2 GET 1',
        terms: 'Must be booked in advance. Same day appointments.',
        expiryDate: '2024-11-25',
        isPopular: false,
        isEndingSoon: true
    },
    {
        id: '6',
        businessId: '2',
        businessName: 'Artisan Coffee Co.',
        title: '25% off Coffee Beans',
        description: 'Take home our premium coffee beans at a special price',
        value: '25% OFF',
        type: 'percentage_off',
        badge: '25% OFF',
        terms: 'In-store purchases only. While stocks last.',
        expiryDate: '2024-12-10',
        isPopular: false,
        isEndingSoon: false
    },
    {
        id: '7',
        businessId: '4',
        businessName: 'The Craft Brewery',
        title: 'Happy Hour: 2-for-1 Pints',
        description: 'Buy one pint and get another one free during happy hour',
        value: 'Save up to £6',
        type: 'two_for_one',
        badge: '2-FOR-1',
        terms: 'Monday to Friday 4-6pm only.',
        expiryDate: '2024-12-31',
        isPopular: true,
        isEndingSoon: false
    },
    {
        id: '8',
        businessId: '6',
        businessName: 'Bella Vista Restaurant',
        title: '30% off Wine Selection',
        description: 'Enjoy our premium wine selection at a discounted price',
        value: '30% OFF',
        type: 'percentage_off',
        badge: '30% OFF',
        terms: 'Dine-in only. Excludes vintage wines.',
        expiryDate: '2024-11-30',
        isPopular: true,
        isEndingSoon: true
    }
];
const mockSecretMenus = [
    {
        id: '1',
        businessId: '1',
        businessName: 'The Seaside Bistro',
        items: [
            {
                name: 'The Captain\'s Special',
                description: 'Pan-seared scallops with black pudding and pea puree, finished with sea foam and caviar pearls. A dish inspired by Bournemouth\'s maritime heritage.',
                price: '£28',
                isSignature: true,
                isPremium: true,
                rarity: 5,
                chefNote: 'Only available when the tide is high'
            },
            {
                name: 'Fisherman\'s Dawn',
                description: 'Smoked haddock caught at sunrise, poached egg, hollandaise infused with sea salt, served on toasted brioche',
                price: '£16',
                isSignature: false,
                isPremium: false,
                rarity: 3,
                chefNote: 'Available all day, but best before noon'
            },
            {
                name: 'The Smuggler\'s Pie',
                description: 'Traditional steak and kidney pie with a secret ingredient known only to the chef\'s family for three generations',
                price: '£22',
                isSignature: true,
                isPremium: true,
                rarity: 4,
                chefNote: 'Recipe dates back to 1847'
            }
        ]
    },
    {
        id: '2',
        businessId: '2',
        businessName: 'Artisan Coffee Co.',
        items: [
            {
                name: 'The Roaster\'s Vault',
                description: 'Ultra-rare single origin beans from a secret farm in Ethiopia, roasted in small batches of 10kg only. Changes based on harvest seasons.',
                price: '£12',
                isSignature: true,
                isPremium: true,
                rarity: 5,
                chefNote: 'Only 20 cups available per week'
            },
            {
                name: 'Midnight Conspiracy',
                description: 'Dark chocolate from Madagascar, triple espresso shot, hint of smoked chili, topped with gold leaf',
                price: '£8.50',
                isSignature: false,
                isPremium: true,
                rarity: 4,
                chefNote: 'Only served after 8pm'
            },
            {
                name: 'The Barista\'s Secret',
                description: 'A coffee blend that changes daily based on the barista\'s mood and the weather. No two cups are ever the same.',
                price: '£6',
                isSignature: true,
                isPremium: false,
                rarity: 3,
                chefNote: 'Ask the barista to surprise you'
            }
        ]
    },
    {
        id: '3',
        businessId: '4',
        businessName: 'The Craft Brewery',
        items: [
            {
                name: 'The Brewmaster\'s Ghost',
                description: 'Imperial stout aged in whiskey barrels for 18 months, infused with vanilla and oak. Only brewed during the winter solstice.',
                price: '£15',
                isSignature: true,
                isPremium: true,
                rarity: 5,
                chefNote: 'Limited to 100 bottles per year'
            },
            {
                name: 'Hop Thief\'s Escape',
                description: 'IPA with hops stolen from seven different breweries (legally, of course). Each sip tells a different story.',
                price: '£7.50',
                isSignature: false,
                isPremium: false,
                rarity: 3,
                chefNote: 'Recipe changes every month'
            },
            {
                name: 'The Underground',
                description: 'A beer so secret, it\'s not even on this menu. Ask the bartender if you dare.',
                price: '£??',
                isSignature: true,
                isPremium: true,
                rarity: 5,
                chefNote: 'Speak the password: "Bournemouth Depths"'
            }
        ]
    }
];
const suggestedPrompts = [
    'Find me a great coffee shop nearby',
    'What\'s good for dinner tonight?',
    'Show me businesses with secret menus',
    'Any offers ending soon?',
    'Best rated restaurants in Bournemouth',
    'What\'s open right now?'
];
const mockUserCredits = {
    balance: 150,
    tier: 'Silver',
    pointsToNextTier: 100,
    recentEarnings: [
        {
            action: 'Business visit',
            points: 10,
            date: '2024-01-14'
        },
        {
            action: 'Review written',
            points: 25,
            date: '2024-01-13'
        },
        {
            action: 'Offer claimed',
            points: 5,
            date: '2024-01-12'
        },
        {
            action: 'Secret menu discovered',
            points: 15,
            date: '2024-01-11'
        }
    ],
    availableRewards: [
        {
            name: 'Free coffee at Artisan Coffee Co.',
            cost: 50,
            available: true
        },
        {
            name: '10% off at The Seaside Bistro',
            cost: 75,
            available: true
        },
        {
            name: 'Free spa treatment consultation',
            cost: 100,
            available: true
        },
        {
            name: 'VIP brewery tour',
            cost: 200,
            available: false
        }
    ]
};
const mockClaimedOffers = [
    {
        id: '1',
        offerId: '1',
        status: 'redeemed',
        claimedAt: '2024-01-10T10:30:00Z',
        walletAddedAt: '2024-01-10T10:35:00Z',
        redeemedAt: '2024-01-12T19:45:00Z',
        businessName: 'The Seaside Bistro',
        offerTitle: '2-for-1 Fish & Chips',
        value: '£24.99',
        redemptionCode: 'QWK-FSH-001'
    },
    {
        id: '2',
        offerId: '2',
        status: 'wallet_added',
        claimedAt: '2024-01-14T14:20:00Z',
        walletAddedAt: '2024-01-14T14:22:00Z',
        redeemedAt: null,
        businessName: 'Artisan Coffee Co.',
        offerTitle: 'Free Pastry with Coffee',
        value: '£4.50',
        redemptionCode: 'QWK-PST-002'
    },
    {
        id: '3',
        offerId: '3',
        status: 'claimed',
        claimedAt: '2024-01-15T09:15:00Z',
        walletAddedAt: null,
        redeemedAt: null,
        businessName: 'The Craft Brewery',
        offerTitle: '20% off Tasting Flights',
        value: '20% off',
        redemptionCode: 'QWK-DIN-003'
    }
];
const mockBusinessAnalytics = {
    'the-seaside-bistro': {
        offers: {
            '1': {
                views: 1247,
                claims: 89,
                walletAdds: 76,
                redemptions: 34,
                revenue: '£843.66',
                conversionRate: {
                    viewToClaim: '7.1%',
                    claimToWallet: '85.4%',
                    walletToRedemption: '44.7%',
                    overallConversion: '2.7%'
                }
            }
        },
        totalOfferViews: 2891,
        totalClaims: 203,
        totalRedemptions: 78,
        newCustomersFromOffers: 45,
        repeatCustomerRate: '67%'
    },
    'artisan-coffee-co': {
        offers: {
            '2': {
                views: 892,
                claims: 156,
                walletAdds: 134,
                redemptions: 89,
                revenue: '£623.50',
                conversionRate: {
                    viewToClaim: '17.5%',
                    claimToWallet: '85.9%',
                    walletToRedemption: '66.4%',
                    overallConversion: '10.0%'
                }
            }
        },
        totalOfferViews: 1456,
        totalClaims: 298,
        totalRedemptions: 156,
        newCustomersFromOffers: 89,
        repeatCustomerRate: '78%'
    }
};
const mockBadges = [
    // COMMON BADGES
    {
        id: 'first_visit',
        name: 'First Steps',
        description: 'Made your first business visit',
        icon: '👣',
        rarity: 'common'
    },
    {
        id: 'chat_starter',
        name: 'Conversation Starter',
        description: 'Had your first AI chat conversation',
        icon: '💬',
        rarity: 'common'
    },
    {
        id: 'offer_collector',
        name: 'Deal Hunter',
        description: 'Claimed your first offer',
        icon: '🎯',
        rarity: 'common'
    },
    // RARE BADGES
    {
        id: 'secret_seeker',
        name: 'Secret Seeker',
        description: 'Unlocked your first secret menu item',
        icon: '🔍',
        rarity: 'rare'
    },
    {
        id: 'social_butterfly',
        name: 'Social Butterfly',
        description: 'Referred 3 friends to Qwikker',
        icon: '🦋',
        rarity: 'rare',
        alternateRequirement: {
            type: 'referrals',
            amount: 3,
            label: '3 friends referred'
        }
    },
    {
        id: 'local_expert',
        name: 'Local Expert',
        description: 'Visited 10 different businesses',
        icon: '🏆',
        rarity: 'rare',
        alternateRequirement: {
            type: 'visits',
            amount: 10,
            label: '10 businesses visited'
        }
    },
    {
        id: 'streak_master',
        name: 'Streak Master',
        description: 'Used Qwikker for 7 days straight',
        icon: '🔥',
        rarity: 'rare',
        alternateRequirement: {
            type: 'days',
            amount: 7,
            label: '7 days active'
        }
    },
    // EPIC BADGES
    {
        id: 'secret_master',
        name: 'Secret Menu Master',
        description: 'Unlocked 25 secret menu items',
        icon: '🗝️',
        rarity: 'epic',
        alternateRequirement: {
            type: 'unlocks',
            amount: 25,
            label: '25 secret items unlocked'
        }
    },
    {
        id: 'influence_master',
        name: 'Hype Lord',
        description: 'Referred 10 friends to Qwikker',
        icon: '📢',
        rarity: 'epic',
        alternateRequirement: {
            type: 'referrals',
            amount: 10,
            label: '10 friends referred'
        },
        reward: {
            type: 'free_item',
            businessName: 'Any Partner Venue',
            businessId: 'all',
            title: '£5 Qwikker Credit',
            description: 'Refer 10 friends reward + 50p for each additional referral',
            value: '£5',
            terms: 'Valid at all partner venues. Cannot be combined with other offers. Show badge to redeem.',
            redemptionCode: 'QWIK-EPIC-SOCIAL'
        }
    },
    {
        id: 'points_collector',
        name: 'Point Collector',
        description: 'Earned 5,000 total points',
        icon: '💎',
        rarity: 'epic',
        pointsRequired: 5000,
        reward: {
            type: 'free_item',
            businessName: 'Any Partner Venue',
            businessId: 'all',
            title: '£4 Qwikker Credit',
            description: 'Use this credit at any participating Qwikker partner venue',
            value: '£4',
            terms: 'Valid at all partner venues. Cannot be combined with other offers. Show badge to redeem.',
            redemptionCode: 'QWIK-EPIC-POINTS'
        }
    },
    // LEGENDARY BADGES
    {
        id: 'bournemouth_legend',
        name: 'Bournemouth Legend',
        description: 'Ultimate Bournemouth mastery - complete all achievements',
        icon: '👑',
        rarity: 'legendary',
        pointsRequired: 15000,
        reward: {
            type: 'free_item',
            businessName: 'Any Partner Venue',
            businessId: 'all',
            title: '£20 Qwikker Credit',
            description: 'Ultimate recognition for true Bournemouth mastery',
            value: '£20',
            terms: 'Valid at all partner venues. Cannot be combined with other offers. Show badge to redeem.',
            redemptionCode: 'QWIK-LEGEND-MASTER'
        }
    },
    {
        id: 'founding_member',
        name: 'Founding Member',
        description: 'One of the first 100 Qwikker users',
        icon: '⭐',
        rarity: 'legendary',
        pointsRequired: 8000,
        reward: {
            type: 'free_item',
            businessName: 'Any Partner Venue',
            businessId: 'all',
            title: '£15 Qwikker Credit',
            description: 'Special recognition for being an early Qwikker pioneer',
            value: '£15',
            terms: 'Valid at all partner venues. Cannot be combined with other offers. Show badge to redeem.',
            redemptionCode: 'QWIK-LEGEND-FOUNDER'
        }
    }
];
const mockUserProfile = {
    id: 'user_david_123',
    name: 'David',
    email: 'david@example.com',
    joinedDate: '2024-01-05T00:00:00Z',
    totalPoints: 1250,
    level: 3,
    experiencePoints: 1250,
    nextLevelXP: 2000,
    tier: 'insider',
    badges: [
        {
            ...mockBadges[0],
            unlockedDate: '2024-01-05T12:00:00Z'
        },
        {
            ...mockBadges[1],
            unlockedDate: '2024-01-05T14:30:00Z'
        },
        {
            ...mockBadges[2],
            unlockedDate: '2024-01-06T10:15:00Z'
        },
        {
            ...mockBadges[3],
            unlockedDate: '2024-01-08T16:45:00Z'
        },
        {
            ...mockBadges[4],
            progress: {
                current: 1,
                target: 3
            } // Social Butterfly (in progress)
        },
        {
            ...mockBadges[5],
            progress: {
                current: 4,
                target: 10
            } // Local Expert (in progress)
        }
    ],
    stats: {
        businessesVisited: 4,
        secretItemsUnlocked: 2,
        offersRedeemed: 3,
        friendsReferred: 1,
        reviewsWritten: 0,
        photosShared: 0,
        chatMessages: 15,
        streakDays: 3
    },
    referralCode: 'DAVID-QWK-2024',
    referredBy: undefined
};
const mockPointsHistory = [
    {
        id: 'txn_001',
        type: 'earned',
        amount: 25,
        reason: 'business_visit',
        description: 'Visited The Seaside Bistro',
        timestamp: '2024-01-15T12:30:00Z',
        relatedItem: {
            type: 'business',
            id: '1',
            name: 'The Seaside Bistro'
        }
    },
    {
        id: 'txn_002',
        type: 'earned',
        amount: 50,
        reason: 'secret_unlock',
        description: 'Unlocked "The Midnight Burger"',
        timestamp: '2024-01-15T12:45:00Z',
        relatedItem: {
            type: 'secret_item',
            id: 'midnight_burger',
            name: 'The Midnight Burger'
        }
    },
    {
        id: 'txn_003',
        type: 'earned',
        amount: 30,
        reason: 'secret_unlock',
        description: 'Unlocked "Captain\'s Hidden Treasure"',
        timestamp: '2024-01-14T19:20:00Z',
        relatedItem: {
            type: 'secret_item',
            id: 'captains_dessert',
            name: 'Captain\'s Hidden Treasure'
        }
    },
    {
        id: 'txn_004',
        type: 'earned',
        amount: 50,
        reason: 'offer_redeem',
        description: 'Redeemed 2-for-1 Fish & Chips',
        timestamp: '2024-01-12T19:45:00Z',
        relatedItem: {
            type: 'offer',
            id: '1',
            name: '2-for-1 Fish & Chips'
        }
    },
    {
        id: 'txn_005',
        type: 'earned',
        amount: 500,
        reason: 'friend_referral',
        description: 'Friend Sarah joined Qwikker',
        timestamp: '2024-01-10T14:15:00Z'
    },
    {
        id: 'txn_006',
        type: 'earned',
        amount: 100,
        reason: 'business_visit',
        description: 'Visited Artisan Coffee Co.',
        timestamp: '2024-01-08T09:30:00Z',
        relatedItem: {
            type: 'business',
            id: '2',
            name: 'Artisan Coffee Co.'
        }
    }
];
const pointsEarningRules = {
    friend_referral: {
        points: 500,
        description: 'Friend joins Qwikker using your referral link'
    },
    offer_redeem: {
        points: 50,
        description: 'Actually redeem an offer at a business (verified by staff)'
    },
    business_visit: {
        points: 25,
        description: 'Visit a business (simplified validation coming soon)'
    },
    review_write: {
        points: 20,
        description: 'Write a review after business visit'
    },
    social_share: {
        points: 10,
        description: 'Share a business or offer on social media'
    }
};
const levelSystem = {
    levels: [
        {
            level: 1,
            pointsRequired: 0,
            tier: 'explorer',
            title: 'Qwikker Explorer',
            benefits: [
                'Access to basic features',
                'Earn points for activities'
            ]
        },
        {
            level: 2,
            pointsRequired: 250,
            tier: 'explorer',
            title: 'Local Explorer',
            benefits: [
                'Unlock secret menu hints',
                'Basic badge rewards'
            ]
        },
        {
            level: 3,
            pointsRequired: 750,
            tier: 'insider',
            title: 'Qwikker Insider',
            benefits: [
                'Enhanced AI recommendations',
                'Priority support'
            ]
        },
        {
            level: 4,
            pointsRequired: 2000,
            tier: 'insider',
            title: 'Bournemouth Insider',
            benefits: [
                'Exclusive offers',
                'Early access to new features'
            ]
        },
        {
            level: 5,
            pointsRequired: 4000,
            tier: 'legend',
            title: 'Local Legend',
            benefits: [
                'VIP treatment at partners',
                'Custom recommendations'
            ]
        },
        {
            level: 6,
            pointsRequired: 8000,
            tier: 'legend',
            title: 'Qwikker Legend',
            benefits: [
                'Ultimate rewards',
                'Influence on new features'
            ]
        }
    ],
    // Calculate level from points
    getLevelFromPoints: (points)=>{
        for(let i = levelSystem.levels.length - 1; i >= 0; i--){
            if (points >= levelSystem.levels[i].pointsRequired) {
                return levelSystem.levels[i];
            }
        }
        return levelSystem.levels[0];
    },
    // Get next level info
    getNextLevel: (currentLevel)=>{
        return levelSystem.levels.find((l)=>l.level === currentLevel + 1) || null;
    }
};
const enhancedSecretMenus = [
    {
        id: 'seaside_secrets',
        businessId: '1',
        businessName: 'The Seaside Bistro',
        items: [
            {
                id: 'midnight_burger',
                name: 'The Midnight Burger',
                description: 'A legendary wagyu beef patty with truffle aioli, caramelized onions, and aged cheddar on a brioche bun baked fresh at 5am',
                price: '£18',
                rarity: 5,
                hint: 'This isn\'t just any burger - it\'s made with ingredients that aren\'t available during regular hours. The chef only makes 10 per day, and regulars know to ask for it by name...',
                chefNote: 'This recipe took me 3 years to perfect. The secret is in the overnight-marinated patty and our special 5am brioche.',
                unlockMethods: [
                    {
                        type: 'visit',
                        description: 'Visit restaurant and scan secret menu QR code'
                    },
                    {
                        type: 'points',
                        cost: 75,
                        description: 'Spend 75 points to unlock remotely'
                    },
                    {
                        type: 'social',
                        requirement: '2_referrals',
                        description: 'Get 2 friends to join Qwikker'
                    }
                ],
                pointsReward: 50
            },
            {
                id: 'fishermans_secret',
                name: 'The Fisherman\'s Secret',
                description: 'Fresh catch of the day with our secret herb crust, known only to the chef and a few loyal customers',
                price: '£24',
                rarity: 4,
                hint: 'Local fishermen bring us their best catch, and we prepare it with a special herb blend that\'s been in the chef\'s family for generations...',
                chefNote: 'My grandmother\'s recipe from the Dorset coast. The herbs are foraged locally each morning.',
                unlockMethods: [
                    {
                        type: 'visit',
                        description: 'Visit restaurant and scan secret menu QR code'
                    },
                    {
                        type: 'points',
                        cost: 60,
                        description: 'Spend 60 points to unlock remotely'
                    }
                ],
                pointsReward: 40
            },
            {
                id: 'captains_dessert',
                name: 'Captain\'s Hidden Treasure',
                description: 'A dessert that changes daily based on the chef\'s inspiration and available ingredients',
                price: '£12',
                rarity: 3,
                hint: 'Every day brings a new treasure - sometimes it\'s a decadent chocolate creation, other times a light fruit masterpiece...',
                unlockMethods: [
                    {
                        type: 'visit',
                        description: 'Visit restaurant and scan secret menu QR code'
                    },
                    {
                        type: 'points',
                        cost: 45,
                        description: 'Spend 45 points to unlock remotely'
                    }
                ],
                pointsReward: 30
            }
        ]
    },
    {
        id: 'coffee_secrets',
        businessId: '2',
        businessName: 'Artisan Coffee Co.',
        items: [
            {
                id: 'baristas_blend',
                name: 'The Barista\'s Personal Blend',
                description: 'A unique coffee blend created by our head barista, not available to the public',
                price: '£4.50',
                rarity: 4,
                hint: 'Our head barista spent months perfecting this blend using beans from three different continents...',
                chefNote: 'I roast this blend personally every Monday morning. It\'s my passion project.',
                unlockMethods: [
                    {
                        type: 'visit',
                        description: 'Visit coffee shop and scan secret menu QR code'
                    },
                    {
                        type: 'points',
                        cost: 50,
                        description: 'Spend 50 points to unlock remotely'
                    }
                ],
                pointsReward: 35
            },
            {
                id: 'hidden_latte',
                name: 'The Underground Latte',
                description: 'Made with our secret spice blend and served in a special ceramic cup',
                price: '£5.25',
                rarity: 3,
                hint: 'The spice blend includes cardamom, cinnamon, and something special that regular customers rave about...',
                unlockMethods: [
                    {
                        type: 'visit',
                        description: 'Visit coffee shop and scan secret menu QR code'
                    },
                    {
                        type: 'points',
                        cost: 40,
                        description: 'Spend 40 points to unlock remotely'
                    }
                ],
                pointsReward: 25
            }
        ]
    }
];
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/user/user-chat-page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "UserChatPage",
    ()=>UserChatPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.3_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/card.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/mock-data/user-mock-data.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.3_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.3_react-dom@19.1.0_react@19.1.0__react@19.1.0/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
function UserChatPage() {
    _s();
    const [messages, setMessages] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [inputValue, setInputValue] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [isTyping, setIsTyping] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [conversationContext, setConversationContext] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const [hasAutoSent, setHasAutoSent] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isInitialized, setIsInitialized] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const handleSendMessage = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useCallback({
        "UserChatPage.useCallback[handleSendMessage]": async (message)=>{
            if (!message.trim()) return;
            // Add user message
            const userMessage = {
                id: Date.now().toString(),
                type: 'user',
                content: message,
                timestamp: new Date().toISOString()
            };
            setMessages({
                "UserChatPage.useCallback[handleSendMessage]": (prev)=>{
                    const newMessages = [
                        ...prev,
                        userMessage
                    ];
                    // Persist to localStorage
                    if ("TURBOPACK compile-time truthy", 1) {
                        localStorage.setItem('qwikker-chat-messages', JSON.stringify(newMessages));
                    }
                    return newMessages;
                }
            }["UserChatPage.useCallback[handleSendMessage]"]);
            setInputValue('');
            setIsTyping(true);
            // Simulate AI response with business recommendations
            setTimeout({
                "UserChatPage.useCallback[handleSendMessage]": ()=>{
                    const assistantMessage = {
                        id: (Date.now() + 1).toString(),
                        type: 'assistant',
                        content: getMockResponse(message),
                        timestamp: new Date().toISOString(),
                        businessCards: getRelevantBusinesses(message)
                    };
                    setMessages({
                        "UserChatPage.useCallback[handleSendMessage]": (prev)=>{
                            const newMessages = [
                                ...prev,
                                assistantMessage
                            ];
                            // Persist to localStorage
                            if ("TURBOPACK compile-time truthy", 1) {
                                localStorage.setItem('qwikker-chat-messages', JSON.stringify(newMessages));
                            }
                            return newMessages;
                        }
                    }["UserChatPage.useCallback[handleSendMessage]"]);
                    setIsTyping(false);
                }
            }["UserChatPage.useCallback[handleSendMessage]"], 1500);
        }
    }["UserChatPage.useCallback[handleSendMessage]"], []) // Keep empty - getMockResponse and getRelevantBusinesses are stable functions
    ;
    // Initialize chat with context awareness but fresh UI
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useEffect({
        "UserChatPage.useEffect": ()=>{
            if (isInitialized) return;
            if ("TURBOPACK compile-time truthy", 1) {
                // Load conversation context for AI memory (but don't display history)
                const savedMessages = localStorage.getItem('qwikker-chat-messages');
                if (savedMessages) {
                    try {
                        const parsedMessages = JSON.parse(savedMessages);
                        // Store full context for AI memory (invisible to user)
                        setConversationContext({
                            previousTopics: parsedMessages.map({
                                "UserChatPage.useEffect": (msg)=>msg.content
                            }["UserChatPage.useEffect"]).slice(-10),
                            userPreferences: {},
                            businessInteractions: {} // Could track business mentions
                        });
                    } catch (error) {
                        console.error('Error parsing saved messages:', error);
                    }
                }
                // Always start with ONLY a fresh welcome message (no history shown)
                const welcomeMessage = {
                    id: Date.now().toString(),
                    type: 'assistant',
                    content: "Hi there! I'm your local guide for Bournemouth. I can help you discover amazing businesses, find deals, and explore hidden gems. What are you in the mood for today?",
                    timestamp: new Date().toISOString()
                };
                setMessages([
                    welcomeMessage
                ]); // Always start with just the welcome message
            }
            setIsInitialized(true);
        }
    }["UserChatPage.useEffect"], [
        isInitialized
    ]);
    // Handle URL parameters for auto-sending questions
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useEffect({
        "UserChatPage.useEffect": ()=>{
            if (hasAutoSent || !isInitialized) return;
            const urlParams = new URLSearchParams(window.location.search);
            const business = urlParams.get('business');
            const topic = urlParams.get('topic');
            const offer = urlParams.get('offer');
            const item = urlParams.get('item');
            let autoQuestion = '';
            if (business && topic === 'offer' && offer) {
                autoQuestion = 'Tell me more about the "'.concat(offer, '" offer at ').concat(business, ". What are the details and how can I use it?");
            } else if (business && topic === 'secret-menu' && item) {
                autoQuestion = "I'm interested in the secret menu item \"".concat(item, '" at ').concat(business, ". Can you give me some hints about what this might be?");
            } else if (business && topic === 'secret-menu') {
                autoQuestion = "What secret menu items does ".concat(business, " have? I'd love to know about their off-menu specialties!");
            } else if (business && !topic) {
                autoQuestion = "Tell me about ".concat(business, ". What makes them special and what should I try there?");
            }
            if (autoQuestion) {
                setHasAutoSent(true);
                setTimeout({
                    "UserChatPage.useEffect": ()=>{
                        handleSendMessage(autoQuestion);
                    }
                }["UserChatPage.useEffect"], 500); // Reduced delay
            }
        }
    }["UserChatPage.useEffect"], [
        isInitialized
    ]); // Simplified: only depend on isInitialized
    const getMockResponse = (userMessage)=>{
        const msg = userMessage.toLowerCase();
        // Handle offer-specific questions
        if (msg.includes('offer') && (msg.includes('tell me more') || msg.includes('details'))) {
            if (msg.includes('free pastry') || msg.includes('pastry')) {
                setConversationContext({
                    topic: 'offer',
                    lastCategory: 'cafe',
                    offerInfo: {
                        id: '2',
                        title: 'Free Pastry with Coffee',
                        businessName: 'Artisan Coffee Co.'
                    }
                });
                return "Great question! The 'Free Pastry with Coffee' offer at Artisan Coffee Co. is fantastic! ☕🥐 Here's what you need to know:\n\n• Get any pastry FREE when you buy a specialty coffee\n• Valid on croissants, muffins, Danish pastries\n• One per customer per day\n• Valid until Nov 30th\n\n📱 **How to claim:** You MUST add this offer to your mobile wallet first! I can help you do that right now.\n\nThe baristas are super friendly and will help you pick the perfect pastry to pair with your coffee. Their almond croissants are especially popular! Would you like me to show you directions to get there?";
            }
            if (msg.includes('fish') || msg.includes('2-for-1')) {
                setConversationContext({
                    topic: 'offer',
                    lastCategory: 'restaurant',
                    offerInfo: {
                        id: '1',
                        title: '2-for-1 Fish & Chips',
                        businessName: 'The Seaside Bistro'
                    }
                });
                return "Excellent choice! The '2-for-1 Fish & Chips' at The Seaside Bistro is one of our most popular offers! 🐟🍟 Here are the details:\n\n• Buy one fish & chips, get one completely FREE\n• Valid Monday-Thursday only\n• Fresh cod and hand-cut chips\n• Perfect for sharing or bringing a friend\n• One offer per table\n• Valid until Dec 31st\n\n📱 **How to claim:** First, add this offer to your mobile wallet. I can help you do that right now!\n\nThe portion sizes are generous, so this is incredible value! The fish is caught locally and the chips are made fresh daily. Would you like me to help you make a reservation?";
            }
            return "I'd love to help you with that offer! Can you tell me which specific offer you're asking about? I can give you all the details, terms, and tips on how to make the most of it!\n\n💡 **Pro tip:** Remember to add any offer to your mobile wallet first - that's how you'll claim it at the business!";
        }
        // Handle follow-up responses based on conversation context
        if (conversationContext.waitingFor === 'coffee-details') {
            if (msg.includes('trendy') || msg.includes('modern')) {
                setConversationContext({
                    topic: 'coffee',
                    lastCategory: 'cafe'
                });
                return "Perfect choice! You want the hottest, most Instagram-worthy coffee spots. Here are Bournemouth's trendiest cafes with amazing coffee and killer vibes:";
            }
            if (msg.includes('cozy') || msg.includes('work')) {
                setConversationContext({
                    topic: 'coffee',
                    lastCategory: 'cafe'
                });
                return "Perfect! I know exactly what you mean - a cozy spot to settle in with your laptop. Here are my top picks for coffee shops where you can work comfortably:";
            }
            if (msg.includes('quick') || msg.includes('grab') || msg.includes('go')) {
                setConversationContext({
                    topic: 'coffee',
                    lastCategory: 'cafe'
                });
                return "Got it! You need something fast and convenient. Here are the best grab-and-go coffee spots:";
            }
            if (msg.includes('pastries') || msg.includes('food')) {
                setConversationContext({
                    topic: 'coffee',
                    lastCategory: 'cafe'
                });
                return "Excellent choice! Coffee and pastries are the perfect combo. Here are places with amazing coffee AND delicious treats:";
            }
            if (msg.includes('traditional')) {
                setConversationContext({
                    topic: 'coffee',
                    lastCategory: 'cafe'
                });
                return "Ah, a classic coffee lover! Here are some traditional, old-school coffee shops with that authentic, timeless atmosphere:";
            }
            // Default response if they don't give specific details
            setConversationContext({
                topic: 'coffee',
                lastCategory: 'cafe'
            });
            return "I hear you! Let me show you some fantastic coffee spots that locals love:";
        }
        if (conversationContext.waitingFor === 'restaurant-details') {
            if (msg.includes('casual') || msg.includes('relaxed')) {
                setConversationContext({
                    topic: 'restaurant',
                    lastCategory: 'restaurant'
                });
                return "Perfect! Casual and relaxed it is. Here are some fantastic laid-back restaurants where you can just enjoy good food:";
            }
            if (msg.includes('fancy') || msg.includes('special') || msg.includes('romantic')) {
                setConversationContext({
                    topic: 'restaurant',
                    lastCategory: 'restaurant'
                });
                return "Ooh, special occasion! I love it. Here are some upscale restaurants perfect for a memorable dining experience:";
            }
            if (msg.includes('italian') || msg.includes('seafood') || msg.includes('cuisine')) {
                setConversationContext({
                    topic: 'restaurant',
                    lastCategory: 'restaurant'
                });
                return "Great choice! I know some amazing places that specialize in exactly what you're craving:";
            }
            setConversationContext({
                topic: 'restaurant',
                lastCategory: 'restaurant'
            });
            return "Sounds good! Here are some excellent restaurants I think you'll love:";
        }
        if (conversationContext.waitingFor === 'drinks-details') {
            if (msg.includes('craft beer') || msg.includes('beer')) {
                setConversationContext({
                    topic: 'drinks',
                    lastCategory: 'bar'
                });
                return "Craft beer enthusiast! I respect that. Here are the best spots for amazing local brews:";
            }
            if (msg.includes('cocktails') || msg.includes('mixed')) {
                setConversationContext({
                    topic: 'drinks',
                    lastCategory: 'bar'
                });
                return "Cocktails it is! Here are places that really know how to mix a perfect drink:";
            }
            if (msg.includes('friends') || msg.includes('group')) {
                setConversationContext({
                    topic: 'drinks',
                    lastCategory: 'bar'
                });
                return "Fun with friends! Here are lively spots perfect for a group:";
            }
            setConversationContext({
                topic: 'drinks',
                lastCategory: 'bar'
            });
            return "Great! Here are some excellent spots for drinks:";
        }
        // Direct category detection - simplified
        if (msg.includes('coffee') || msg.includes('cafe')) {
            setConversationContext({
                topic: 'coffee',
                lastCategory: 'cafe'
            });
            return "Here are the best coffee spots in Bournemouth:";
        }
        if (msg.includes('dinner') || msg.includes('restaurant') || msg.includes('food')) {
            setConversationContext({
                topic: 'restaurant',
                lastCategory: 'restaurant'
            });
            return "Here are the best restaurants in Bournemouth:";
        }
        if (msg.includes('drink') || msg.includes('bar') || msg.includes('beer')) {
            setConversationContext({
                topic: 'drinks',
                lastCategory: 'bar'
            });
            return "Here are the best bars and pubs in Bournemouth:";
        }
        if (msg.includes('spa') || msg.includes('relax') || msg.includes('wellness')) {
            setConversationContext({
                topic: 'spa',
                lastCategory: 'spa'
            });
            return "Here are the best wellness and spa options in Bournemouth:";
        }
        if (msg.includes('offer') || msg.includes('deal') || msg.includes('discount')) {
            setConversationContext({
                topic: 'offers',
                showOffers: true
            });
            return "Here are the best current offers in Bournemouth:";
        }
        // Handle specific secret menu item questions
        if (msg.includes('interested in') && msg.includes('secret menu item')) {
            // Extract business and item name from the message
            const businessMatch = msg.match(/at (.+?)\./);
            const itemMatch = msg.match(/item "(.+?)"/);
            if (businessMatch && itemMatch) {
                const businessName = businessMatch[1];
                const itemName = itemMatch[1];
                // Find the secret menu item
                const secretMenu = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["enhancedSecretMenus"].find((menu)=>menu.businessName.toLowerCase().includes(businessName.toLowerCase()));
                if (secretMenu) {
                    const secretItem = secretMenu.items.find((item)=>item.name.toLowerCase().includes(itemName.toLowerCase()));
                    if (secretItem) {
                        return "Ah, you've discovered \"".concat(secretItem.name, '" at ').concat(secretMenu.businessName, "! 🕵️‍♂️ You have excellent taste!\n\n🔍 **Here's what I can tell you:**\n").concat(secretItem.hint, "\n\n🗝️ **How to unlock the full details:**\n").concat(secretItem.unlockMethods.map((method)=>{
                            if (method.type === 'visit') return '• Visit the restaurant and scan their secret menu QR code';
                            if (method.type === 'points') return "• Spend ".concat(method.cost, " points to unlock remotely");
                            if (method.type === 'social') return '• Get friends to join Qwikker';
                            return "• ".concat(method.description);
                        }).join('\n'), "\n\n✨ **Reward:** Unlock this item and earn ").concat(secretItem.pointsReward, " points!\n\nThis is definitely worth pursuing - would you like me to help you plan a visit to ").concat(secretMenu.businessName, "?");
                    }
                }
            }
            return "I'd love to help you with that secret menu item! Can you tell me which business and which item you're curious about? I can give you some tantalizing hints! 🤫";
        }
        if (msg.includes('secret menu items') && msg.includes('what') && msg.includes('have')) {
            // Extract business name
            const businessMatch = msg.match(/does (.+?) have/);
            if (businessMatch) {
                const businessName = businessMatch[1];
                const secretMenu = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["enhancedSecretMenus"].find((menu)=>menu.businessName.toLowerCase().includes(businessName.toLowerCase()));
                if (secretMenu) {
                    const itemsList = secretMenu.items.map((item)=>{
                        const rarityStars = '⭐'.repeat(item.rarity || 3);
                        return "🔒 **".concat(item.name, "** ").concat(rarityStars, "\n   *").concat(item.hint.substring(0, 80), "...*");
                    }).join('\n\n');
                    return "Ooh, ".concat(secretMenu.businessName, " has some incredible secret treasures! 🏴‍☠️ Here's what I can whisper about:\n\n").concat(itemsList, "\n\n🎯 **Want the full details?** Each item can be unlocked by:\n• Visiting the restaurant and scanning their QR code\n• Using your Qwikker points\n• Social challenges\n\nWhich secret item intrigues you most? I can give you more specific hints! 😉");
                }
            }
            return "Great question! Which business are you curious about? I can tell you about their secret menu items - some are legendary! 🗝️";
        }
        if (msg.includes('secret') || msg.includes('hidden')) {
            return "Ah, a fellow secret-seeker! 🤫 I love this question! Are you curious about off-menu items at restaurants, hidden speakeasy-style bars, or maybe secret spots that locals love but tourists don't know about? What kind of secrets intrigue you most?";
        }
        if (msg.includes('offer') || msg.includes('deal') || msg.includes('discount')) {
            return "Smart shopper! 💰 What kind of deals are you hunting for? Restaurant discounts, spa treatments, activities? Are you flexible with timing or looking for something specific today? I can help you find the best value!";
        }
        if (msg.includes('show me') || msg.includes('recommend') || msg.includes('suggest')) {
            return "I'd love to help you discover some amazing places! But first, tell me a bit more about what you're in the mood for. What brings you to Bournemouth today? Are you a local exploring or visiting? What sounds good to you right now?";
        }
        // Handle points and rewards questions
        if (msg.includes('points') || msg.includes('credits') || msg.includes('earn') || msg.includes('badges')) {
            const userPoints = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockUserProfile"].totalPoints;
            const userLevel = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockUserProfile"].level;
            const earnedBadges = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockUserProfile"].badges.filter((b)=>b.unlockedDate).length;
            const totalBadges = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockBadges"].length;
            return "Great question! Here's your current status:\n\n🏆 **Your Progress:**\n• Current Points: ".concat(userPoints.toLocaleString(), "\n• Level: ").concat(userLevel, "\n• Badges Earned: ").concat(earnedBadges, "/").concat(totalBadges, "\n\n💰 **Ways to Earn Points:**\n• Refer Friends: +").concat(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["pointsEarningRules"].friend_referral.points, " points (highest earner!)\n• Redeem Offers: +").concat(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["pointsEarningRules"].offer_redeem.points, " points\n• Visit Businesses: +").concat(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["pointsEarningRules"].business_visit.points, " points\n• Write Reviews: +").concat(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["pointsEarningRules"].review_write.points, " points\n• Share on Social: +").concat(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["pointsEarningRules"].social_share.points, " points\n\nWant to see what badges you can unlock next or check out current offers?");
        }
        // Handle menu questions
        if (msg.includes('menu') || msg.includes('food options')) {
            var _businessesWithMenus__specialties, _businessesWithMenus__specialties1, _businessesWithMenus__specialties2;
            const businessesWithMenus = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockBusinesses"].filter((b)=>b.specialties && b.specialties.length > 0);
            return "I can show you menus from ".concat(businessesWithMenus.length, " amazing restaurants! Each place has their own specialties:\n\n• **").concat(businessesWithMenus[0].name, "**: ").concat((_businessesWithMenus__specialties = businessesWithMenus[0].specialties) === null || _businessesWithMenus__specialties === void 0 ? void 0 : _businessesWithMenus__specialties.join(', '), "\n• **").concat(businessesWithMenus[1].name, "**: ").concat((_businessesWithMenus__specialties1 = businessesWithMenus[1].specialties) === null || _businessesWithMenus__specialties1 === void 0 ? void 0 : _businessesWithMenus__specialties1.join(', '), "\n• **").concat(businessesWithMenus[2].name, "**: ").concat((_businessesWithMenus__specialties2 = businessesWithMenus[2].specialties) === null || _businessesWithMenus__specialties2 === void 0 ? void 0 : _businessesWithMenus__specialties2.join(', '), "\n\nPlus, ").concat(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockBusinesses"].filter((b)=>b.hasSecretMenu).length, " places have secret menus with hidden items! Which type of cuisine interests you most?");
        }
        // Handle offers questions
        if (msg.includes('offers') || msg.includes('deals') || msg.includes('discounts')) {
            const totalOffers = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockOffers"].length;
            const endingSoon = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockOffers"].filter((o)=>o.badge === 'Ends Soon').length;
            return "Amazing timing! We currently have ".concat(totalOffers, " active offers available:\n\n🔥 **Hot Deals:**\n• ").concat(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockOffers"][0].title, " at ").concat(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockOffers"][0].businessName, "\n• ").concat(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockOffers"][1].title, " at ").concat(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockOffers"][1].businessName, "\n• ").concat(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockOffers"][2].title, " at ").concat(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockOffers"][2].businessName, "\n\n⚡ ").concat(endingSoon, " offers are ending soon!\n\n💡 **Pro tip:** Add offers to your mobile wallet to claim them easily. Want to see all offers or focus on a specific type of cuisine?");
        }
        // Default conversational responses with data awareness (NO welcome message)
        const totalBusinesses = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockBusinesses"].length;
        const secretMenuCount = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockBusinesses"].filter((b)=>b.hasSecretMenu).length;
        const responses = [
            "I'm here to help you explore Bournemouth! We have ".concat(totalBusinesses, " partner venues, ").concat(secretMenuCount, " with secret menus, and ").concat(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockOffers"].length, " active offers. What sounds good?"),
            "Tell me what you're in the mood for! I can help with restaurants, offers, secret menus, or even show you how to earn more Qwikker Credits (you currently have ".concat(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockUserProfile"].totalPoints.toLocaleString(), " points!)."),
            "Great! I can help you discover amazing places. Are you looking for food, drinks, deals, or want to know about earning more points? You're level ".concat(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockUserProfile"].level, " with ").concat(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockUserProfile"].badges.filter((b)=>b.unlockedDate).length, " badges!"),
            "Perfect! What kind of experience are you after? I know all ".concat(totalBusinesses, " partner venues and can show you the best deals and secret menu items!")
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    };
    const getRelevantBusinesses = (userMessage)=>{
        const msg = userMessage.toLowerCase();
        // Show business cards based on conversation context
        const shouldShowBusinesses = // Follow-up responses that should show businesses
        conversationContext.waitingFor === 'coffee-details' || conversationContext.waitingFor === 'restaurant-details' || conversationContext.waitingFor === 'drinks-details' || conversationContext.lastCategory || // Direct specific requests
        msg.includes('show me') || msg.includes('yes') || msg.includes('please') || // Specific descriptors
        msg.includes('cozy') || msg.includes('quick') || msg.includes('fancy') || msg.includes('casual') || msg.includes('craft beer') || msg.includes('cocktails') || msg.includes('massage') || msg.includes('facial') || msg.includes('romantic') || msg.includes('friends') || msg.includes('date night') || msg.includes('coffee') && (msg.includes('work') || msg.includes('pastries') || msg.includes('cozy')) || msg.includes('restaurant') && (msg.includes('italian') || msg.includes('seafood') || msg.includes('romantic'));
        if (!shouldShowBusinesses) {
            return [] // Don't show business cards for initial/general queries
            ;
        }
        let relevantBusinesses = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockBusinesses"];
        // Use conversation context to determine category
        if (conversationContext.lastCategory === 'cafe' || conversationContext.waitingFor === 'coffee-details' || msg.includes('coffee') || msg.includes('cafe')) {
            relevantBusinesses = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockBusinesses"].filter((b)=>b.category.toLowerCase().includes('cafe'));
        } else if (conversationContext.lastCategory === 'restaurant' || conversationContext.waitingFor === 'restaurant-details' || msg.includes('restaurant') || msg.includes('dinner') || msg.includes('food')) {
            relevantBusinesses = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockBusinesses"].filter((b)=>b.category.toLowerCase().includes('restaurant'));
        } else if (conversationContext.lastCategory === 'bar' || conversationContext.waitingFor === 'drinks-details' || msg.includes('bar') || msg.includes('drink') || msg.includes('beer')) {
            relevantBusinesses = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockBusinesses"].filter((b)=>b.category.toLowerCase().includes('bar'));
        } else if (conversationContext.lastCategory === 'spa' || conversationContext.waitingFor === 'spa-details' || msg.includes('spa') || msg.includes('wellness')) {
            relevantBusinesses = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockBusinesses"].filter((b)=>b.category.toLowerCase().includes('spa'));
        }
        return relevantBusinesses.slice(0, 2).map((business)=>({
                id: business.id,
                name: business.name,
                tagline: business.tagline,
                image: business.images[0],
                rating: business.rating,
                distance: business.distance,
                activeOffers: business.activeOffers
            }));
    };
    const handleSuggestedPrompt = (prompt)=>{
        handleSendMessage(prompt);
    };
    const BusinessCard = (param)=>{
        let { business } = param;
        var _mockBusinesses_find;
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
            className: "bg-gradient-to-br from-slate-700/50 to-slate-600/30 border-slate-600 hover:border-[#00d083]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#00d083]/10 group cursor-pointer overflow-hidden max-w-xs",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "relative h-32 overflow-hidden",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                            src: business.image,
                            alt: business.name,
                            className: "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        }, void 0, false, {
                            fileName: "[project]/components/user/user-chat-page.tsx",
                            lineNumber: 426,
                            columnNumber: 9
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
                        }, void 0, false, {
                            fileName: "[project]/components/user/user-chat-page.tsx",
                            lineNumber: 431,
                            columnNumber: 9
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "absolute bottom-2 left-2",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "bg-black/70 text-slate-100 text-xs px-2 py-1 rounded-full backdrop-blur-sm",
                                children: [
                                    business.distance,
                                    " miles"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/user/user-chat-page.tsx",
                                lineNumber: 433,
                                columnNumber: 11
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/user/user-chat-page.tsx",
                            lineNumber: 432,
                            columnNumber: 9
                        }, this),
                        business.activeOffers > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "absolute top-2 right-2",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "bg-orange-500 text-slate-100 text-xs px-2 py-1 rounded-full",
                                children: [
                                    business.activeOffers,
                                    " OFFERS"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/user/user-chat-page.tsx",
                                lineNumber: 439,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/user/user-chat-page.tsx",
                            lineNumber: 438,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/user/user-chat-page.tsx",
                    lineNumber: 425,
                    columnNumber: 7
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                    className: "p-3",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                            className: "text-slate-100 font-semibold text-sm mb-1",
                            children: business.name
                        }, void 0, false, {
                            fileName: "[project]/components/user/user-chat-page.tsx",
                            lineNumber: 447,
                            columnNumber: 9
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-[#00d083] text-xs mb-2",
                            children: business.tagline
                        }, void 0, false, {
                            fileName: "[project]/components/user/user-chat-page.tsx",
                            lineNumber: 448,
                            columnNumber: 9
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-1 mb-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex",
                                    children: [
                                        1,
                                        2,
                                        3,
                                        4,
                                        5
                                    ].map((star)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                            className: "w-3 h-3 ".concat(star <= business.rating ? 'text-yellow-400' : 'text-gray-600'),
                                            fill: "currentColor",
                                            viewBox: "0 0 20 20",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                d: "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                                            }, void 0, false, {
                                                fileName: "[project]/components/user/user-chat-page.tsx",
                                                lineNumber: 458,
                                                columnNumber: 17
                                            }, this)
                                        }, star, false, {
                                            fileName: "[project]/components/user/user-chat-page.tsx",
                                            lineNumber: 452,
                                            columnNumber: 15
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/components/user/user-chat-page.tsx",
                                    lineNumber: 450,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-slate-100 text-xs font-medium",
                                    children: business.rating
                                }, void 0, false, {
                                    fileName: "[project]/components/user/user-chat-page.tsx",
                                    lineNumber: 462,
                                    columnNumber: 11
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/user/user-chat-page.tsx",
                            lineNumber: 449,
                            columnNumber: 9
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                            asChild: true,
                            size: "sm",
                            className: "w-full bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black font-medium",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: "/user/business/".concat((_mockBusinesses_find = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockBusinesses"].find((b)=>b.id === business.id)) === null || _mockBusinesses_find === void 0 ? void 0 : _mockBusinesses_find.slug),
                                children: "View Details"
                            }, void 0, false, {
                                fileName: "[project]/components/user/user-chat-page.tsx",
                                lineNumber: 465,
                                columnNumber: 11
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/user/user-chat-page.tsx",
                            lineNumber: 464,
                            columnNumber: 9
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/user/user-chat-page.tsx",
                    lineNumber: 446,
                    columnNumber: 7
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/user/user-chat-page.tsx",
            lineNumber: 424,
            columnNumber: 5
        }, this);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col h-full max-h-[calc(100vh-2rem)]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-6 text-center relative",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-0 bg-gradient-to-r from-[#00d083]/10 via-purple-500/5 to-blue-500/10 rounded-2xl blur-3xl"
                    }, void 0, false, {
                        fileName: "[project]/components/user/user-chat-page.tsx",
                        lineNumber: 475,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "relative",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center justify-center gap-3 mb-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-3 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-full animate-pulse",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                            className: "w-8 h-8 text-black",
                                            fill: "none",
                                            stroke: "currentColor",
                                            viewBox: "0 0 24 24",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                strokeLinecap: "round",
                                                strokeLinejoin: "round",
                                                strokeWidth: 2,
                                                d: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.091zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                                            }, void 0, false, {
                                                fileName: "[project]/components/user/user-chat-page.tsx",
                                                lineNumber: 480,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/components/user/user-chat-page.tsx",
                                            lineNumber: 479,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/components/user/user-chat-page.tsx",
                                        lineNumber: 478,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                        className: "text-4xl font-bold bg-gradient-to-r from-[#00d083] via-blue-400 to-purple-400 bg-clip-text text-transparent",
                                        children: "Your AI Local Guide"
                                    }, void 0, false, {
                                        fileName: "[project]/components/user/user-chat-page.tsx",
                                        lineNumber: 483,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "w-2 h-2 bg-green-400 rounded-full animate-pulse"
                                    }, void 0, false, {
                                        fileName: "[project]/components/user/user-chat-page.tsx",
                                        lineNumber: 486,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/user/user-chat-page.tsx",
                                lineNumber: 477,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xl text-slate-300 mb-2",
                                children: "Discover Bournemouth's best kept secrets through conversation"
                            }, void 0, false, {
                                fileName: "[project]/components/user/user-chat-page.tsx",
                                lineNumber: 488,
                                columnNumber: 9
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-slate-400",
                                children: "Ask about menus, deals, hidden gems, or get personalized recommendations"
                            }, void 0, false, {
                                fileName: "[project]/components/user/user-chat-page.tsx",
                                lineNumber: 491,
                                columnNumber: 9
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/user/user-chat-page.tsx",
                        lineNumber: 476,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/user/user-chat-page.tsx",
                lineNumber: 474,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 flex flex-col bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-700/30 rounded-2xl border border-slate-600 shadow-2xl shadow-[#00d083]/5 overflow-hidden backdrop-blur-sm",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-1 overflow-y-auto p-4 space-y-4",
                        children: [
                            messages.map((message)=>{
                                var _conversationContext_offerInfo;
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex ".concat(message.type === 'user' ? 'justify-end' : 'justify-start'),
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "max-w-[80%] ".concat(message.type === 'user' ? 'order-2' : 'order-1'),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "rounded-2xl px-4 py-3 shadow-lg ".concat(message.type === 'user' ? 'bg-gradient-to-r from-[#00d083] to-[#00b86f] text-black ml-auto shadow-[#00d083]/20' : 'bg-gradient-to-r from-slate-700/80 to-slate-600/80 text-slate-100 border border-slate-600/50 shadow-slate-900/20'),
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-sm leading-relaxed",
                                                    children: message.content
                                                }, void 0, false, {
                                                    fileName: "[project]/components/user/user-chat-page.tsx",
                                                    lineNumber: 510,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/user/user-chat-page.tsx",
                                                lineNumber: 505,
                                                columnNumber: 17
                                            }, this),
                                            message.businessCards && message.businessCards.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex gap-3 mt-3 overflow-x-auto",
                                                children: message.businessCards.map((business)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(BusinessCard, {
                                                        business: business
                                                    }, business.id, false, {
                                                        fileName: "[project]/components/user/user-chat-page.tsx",
                                                        lineNumber: 517,
                                                        columnNumber: 23
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "[project]/components/user/user-chat-page.tsx",
                                                lineNumber: 515,
                                                columnNumber: 19
                                            }, this),
                                            message.type === 'assistant' && conversationContext.offerInfo && message.content.includes('add this offer to your mobile wallet') && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "mt-3",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                                    onClick: ()=>{
                                                        var _conversationContext_offerInfo;
                                                        // Simulate adding to wallet
                                                        alert('"'.concat((_conversationContext_offerInfo = conversationContext.offerInfo) === null || _conversationContext_offerInfo === void 0 ? void 0 : _conversationContext_offerInfo.title, '" has been added to your mobile wallet!'));
                                                    },
                                                    className: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-slate-100 font-semibold",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                            className: "w-4 h-4 mr-2",
                                                            fill: "none",
                                                            stroke: "currentColor",
                                                            viewBox: "0 0 24 24",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                                strokeLinecap: "round",
                                                                strokeLinejoin: "round",
                                                                strokeWidth: 2,
                                                                d: "M12 4v16m8-8H4"
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/user/user-chat-page.tsx",
                                                                lineNumber: 533,
                                                                columnNumber: 25
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/user/user-chat-page.tsx",
                                                            lineNumber: 532,
                                                            columnNumber: 23
                                                        }, this),
                                                        'Add "',
                                                        (_conversationContext_offerInfo = conversationContext.offerInfo) === null || _conversationContext_offerInfo === void 0 ? void 0 : _conversationContext_offerInfo.title,
                                                        '" to Wallet'
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/user/user-chat-page.tsx",
                                                    lineNumber: 525,
                                                    columnNumber: 21
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/user/user-chat-page.tsx",
                                                lineNumber: 524,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-slate-400 mt-1 px-2",
                                                children: new Date(message.timestamp).toLocaleTimeString('en-GB', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: false
                                                })
                                            }, void 0, false, {
                                                fileName: "[project]/components/user/user-chat-page.tsx",
                                                lineNumber: 540,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/user/user-chat-page.tsx",
                                        lineNumber: 504,
                                        columnNumber: 15
                                    }, this)
                                }, message.id, false, {
                                    fileName: "[project]/components/user/user-chat-page.tsx",
                                    lineNumber: 503,
                                    columnNumber: 13
                                }, this);
                            }),
                            isTyping && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex justify-start",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "bg-gradient-to-r from-slate-700/80 to-slate-600/80 border border-slate-600/50 rounded-2xl px-4 py-3 shadow-lg",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center space-x-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex space-x-1",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "w-2 h-2 bg-[#00d083] rounded-full animate-bounce"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/user/user-chat-page.tsx",
                                                        lineNumber: 553,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "w-2 h-2 bg-blue-400 rounded-full animate-bounce",
                                                        style: {
                                                            animationDelay: '0.1s'
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/user/user-chat-page.tsx",
                                                        lineNumber: 554,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "w-2 h-2 bg-purple-400 rounded-full animate-bounce",
                                                        style: {
                                                            animationDelay: '0.2s'
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/user/user-chat-page.tsx",
                                                        lineNumber: 555,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/user/user-chat-page.tsx",
                                                lineNumber: 552,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-slate-300 text-sm",
                                                children: "AI is thinking..."
                                            }, void 0, false, {
                                                fileName: "[project]/components/user/user-chat-page.tsx",
                                                lineNumber: 557,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/user/user-chat-page.tsx",
                                        lineNumber: 551,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/user/user-chat-page.tsx",
                                    lineNumber: 550,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/user/user-chat-page.tsx",
                                lineNumber: 549,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/user/user-chat-page.tsx",
                        lineNumber: 501,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-4 border-t border-slate-600/50 bg-gradient-to-r from-slate-800/50 to-slate-700/50",
                        children: [
                            messages.length === 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mb-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-slate-400 text-xs mb-2 text-center",
                                        children: "Try one of these:"
                                    }, void 0, false, {
                                        fileName: "[project]/components/user/user-chat-page.tsx",
                                        lineNumber: 570,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex flex-wrap gap-2 justify-center",
                                        children: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$mock$2d$data$2f$user$2d$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["suggestedPrompts"].slice(0, 6).map((prompt, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>handleSuggestedPrompt(prompt),
                                                className: "bg-slate-700/50 hover:bg-[#00d083]/20 text-slate-300 hover:text-[#00d083] px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border border-slate-600/50 hover:border-[#00d083]/50",
                                                children: prompt.length > 25 ? "".concat(prompt.substring(0, 22), "...") : prompt
                                            }, index, false, {
                                                fileName: "[project]/components/user/user-chat-page.tsx",
                                                lineNumber: 573,
                                                columnNumber: 19
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/components/user/user-chat-page.tsx",
                                        lineNumber: 571,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/user/user-chat-page.tsx",
                                lineNumber: 569,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex gap-3 bg-slate-800/50 rounded-2xl p-2 border border-slate-600/50 focus-within:border-[#00d083]/50 transition-all duration-300 focus-within:shadow-lg focus-within:shadow-[#00d083]/10",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex-1 relative",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        type: "text",
                                                        value: inputValue,
                                                        onChange: (e)=>setInputValue(e.target.value),
                                                        onKeyPress: (e)=>e.key === 'Enter' && handleSendMessage(inputValue),
                                                        placeholder: "Ask me about restaurants, deals, secret menus, or anything...",
                                                        className: "w-full bg-transparent px-4 py-3 text-slate-100 placeholder-gray-400 focus:outline-none text-lg",
                                                        disabled: isTyping
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/user/user-chat-page.tsx",
                                                        lineNumber: 588,
                                                        columnNumber: 17
                                                    }, this),
                                                    !inputValue && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex space-x-1",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "w-1 h-1 bg-[#00d083] rounded-full animate-pulse"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/user/user-chat-page.tsx",
                                                                    lineNumber: 600,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "w-1 h-1 bg-blue-400 rounded-full animate-pulse",
                                                                    style: {
                                                                        animationDelay: '0.2s'
                                                                    }
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/user/user-chat-page.tsx",
                                                                    lineNumber: 601,
                                                                    columnNumber: 23
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "w-1 h-1 bg-purple-400 rounded-full animate-pulse",
                                                                    style: {
                                                                        animationDelay: '0.4s'
                                                                    }
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/user/user-chat-page.tsx",
                                                                    lineNumber: 602,
                                                                    columnNumber: 23
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/components/user/user-chat-page.tsx",
                                                            lineNumber: 599,
                                                            columnNumber: 21
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/user/user-chat-page.tsx",
                                                        lineNumber: 598,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/user/user-chat-page.tsx",
                                                lineNumber: 587,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                                onClick: ()=>handleSendMessage(inputValue),
                                                disabled: !inputValue.trim() || isTyping,
                                                className: "bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100",
                                                children: isTyping ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center gap-2",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/user/user-chat-page.tsx",
                                                        lineNumber: 614,
                                                        columnNumber: 21
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/components/user/user-chat-page.tsx",
                                                    lineNumber: 613,
                                                    columnNumber: 19
                                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                    className: "w-5 h-5",
                                                    fill: "none",
                                                    stroke: "currentColor",
                                                    viewBox: "0 0 24 24",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        strokeWidth: 2,
                                                        d: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/user/user-chat-page.tsx",
                                                        lineNumber: 618,
                                                        columnNumber: 21
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/components/user/user-chat-page.tsx",
                                                    lineNumber: 617,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/user/user-chat-page.tsx",
                                                lineNumber: 607,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/user/user-chat-page.tsx",
                                        lineNumber: 586,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center justify-center gap-4 mt-3 text-xs text-gray-500",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "flex items-center gap-1",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("kbd", {
                                                        className: "bg-slate-700 px-2 py-1 rounded text-slate-400",
                                                        children: "Enter"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/user/user-chat-page.tsx",
                                                        lineNumber: 627,
                                                        columnNumber: 17
                                                    }, this),
                                                    "to send"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/user/user-chat-page.tsx",
                                                lineNumber: 626,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: "•"
                                            }, void 0, false, {
                                                fileName: "[project]/components/user/user-chat-page.tsx",
                                                lineNumber: 630,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: "Powered by AI"
                                            }, void 0, false, {
                                                fileName: "[project]/components/user/user-chat-page.tsx",
                                                lineNumber: 631,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: "•"
                                            }, void 0, false, {
                                                fileName: "[project]/components/user/user-chat-page.tsx",
                                                lineNumber: 632,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "flex items-center gap-1",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$3_react$2d$dom$40$19$2e$1$2e$0_react$40$19$2e$1$2e$0_$5f$react$40$19$2e$1$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "w-2 h-2 bg-green-400 rounded-full animate-pulse"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/user/user-chat-page.tsx",
                                                        lineNumber: 634,
                                                        columnNumber: 17
                                                    }, this),
                                                    "Online"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/user/user-chat-page.tsx",
                                                lineNumber: 633,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/user/user-chat-page.tsx",
                                        lineNumber: 625,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/user/user-chat-page.tsx",
                                lineNumber: 585,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/user/user-chat-page.tsx",
                        lineNumber: 566,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/user/user-chat-page.tsx",
                lineNumber: 498,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/user/user-chat-page.tsx",
        lineNumber: 472,
        columnNumber: 5
    }, this);
}
_s(UserChatPage, "b94Y+XVbMcAp50Dvpr9CxUqFmKM=");
_c = UserChatPage;
var _c;
__turbopack_context__.k.register(_c, "UserChatPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_62915a7b._.js.map