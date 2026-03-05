"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "instrumentation";
exports.ids = ["instrumentation"];
exports.modules = {

/***/ "(instrument)/./src/instrumentation.ts":
/*!********************************!*\
  !*** ./src/instrumentation.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   register: () => (/* binding */ register)\n/* harmony export */ });\n/**\n * Next.js instrumentation hook — runs once when the server starts.\n *\n * When the dev server is launched from a directory other than the project root\n * (e.g. `cd / && next dev /project`), Node.js receives an invalid\n * `--localstorage-file` path and creates a broken `localStorage` global whose\n * methods are `undefined`.  We replace it here with a simple in-memory\n * implementation so that SSR guards like `typeof window !== 'undefined'` work\n * correctly and no unhandled exceptions are thrown.\n */ async function register() {\n    // Only patch on the server (Node.js) side.\n    if (false) {}\n    // If localStorage is already healthy, leave it alone.\n    if (typeof globalThis.localStorage !== 'undefined' && typeof globalThis.localStorage.getItem === 'function') {\n        return;\n    }\n    // Provide a no-op, in-memory localStorage so SSR never throws.\n    const store = new Map();\n    Object.defineProperty(globalThis, 'localStorage', {\n        value: {\n            getItem: (key)=>store.get(key) ?? null,\n            setItem: (key, value)=>{\n                store.set(key, String(value));\n            },\n            removeItem: (key)=>{\n                store.delete(key);\n            },\n            clear: ()=>{\n                store.clear();\n            },\n            get length () {\n                return store.size;\n            },\n            key: (n)=>[\n                    ...store.keys()\n                ][n] ?? null\n        },\n        writable: true,\n        configurable: true\n    });\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGluc3RydW1lbnQpLy4vc3JjL2luc3RydW1lbnRhdGlvbi50cyIsIm1hcHBpbmdzIjoiOzs7O0FBQUE7Ozs7Ozs7OztDQVNDLEdBQ00sZUFBZUE7SUFDcEIsMkNBQTJDO0lBQzNDLElBQUksS0FBNkIsRUFBRSxFQUFPO0lBRTFDLHNEQUFzRDtJQUN0RCxJQUNFLE9BQU9DLFdBQVdDLFlBQVksS0FBSyxlQUNuQyxPQUFPLFdBQVlBLFlBQVksQ0FBYUMsT0FBTyxLQUFLLFlBQ3hEO1FBQ0E7SUFDRjtJQUVBLCtEQUErRDtJQUMvRCxNQUFNQyxRQUFRLElBQUlDO0lBRWxCQyxPQUFPQyxjQUFjLENBQUNOLFlBQVksZ0JBQWdCO1FBQ2hETyxPQUFPO1lBQ0xMLFNBQVMsQ0FBQ00sTUFBK0JMLE1BQU1NLEdBQUcsQ0FBQ0QsUUFBUTtZQUMzREUsU0FBUyxDQUFDRixLQUFhRDtnQkFBMEJKLE1BQU1RLEdBQUcsQ0FBQ0gsS0FBS0ksT0FBT0w7WUFBUztZQUNoRk0sWUFBWSxDQUFDTDtnQkFBd0JMLE1BQU1XLE1BQU0sQ0FBQ047WUFBTTtZQUN4RE8sT0FBTztnQkFBY1osTUFBTVksS0FBSztZQUFJO1lBQ3BDLElBQUlDLFVBQWlCO2dCQUFFLE9BQU9iLE1BQU1jLElBQUk7WUFBRTtZQUMxQ1QsS0FBSyxDQUFDVSxJQUE2Qjt1QkFBSWYsTUFBTWdCLElBQUk7aUJBQUcsQ0FBQ0QsRUFBRSxJQUFJO1FBQzdEO1FBQ0FFLFVBQVU7UUFDVkMsY0FBYztJQUNoQjtBQUNGIiwic291cmNlcyI6WyIvVXNlcnMvYW5raXRtZWhyYS9Eb2N1bWVudHMvaGVhbHRoX2Zyb250ZW5kL3NyYy9pbnN0cnVtZW50YXRpb24udHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBOZXh0LmpzIGluc3RydW1lbnRhdGlvbiBob29rIOKAlCBydW5zIG9uY2Ugd2hlbiB0aGUgc2VydmVyIHN0YXJ0cy5cbiAqXG4gKiBXaGVuIHRoZSBkZXYgc2VydmVyIGlzIGxhdW5jaGVkIGZyb20gYSBkaXJlY3Rvcnkgb3RoZXIgdGhhbiB0aGUgcHJvamVjdCByb290XG4gKiAoZS5nLiBgY2QgLyAmJiBuZXh0IGRldiAvcHJvamVjdGApLCBOb2RlLmpzIHJlY2VpdmVzIGFuIGludmFsaWRcbiAqIGAtLWxvY2Fsc3RvcmFnZS1maWxlYCBwYXRoIGFuZCBjcmVhdGVzIGEgYnJva2VuIGBsb2NhbFN0b3JhZ2VgIGdsb2JhbCB3aG9zZVxuICogbWV0aG9kcyBhcmUgYHVuZGVmaW5lZGAuICBXZSByZXBsYWNlIGl0IGhlcmUgd2l0aCBhIHNpbXBsZSBpbi1tZW1vcnlcbiAqIGltcGxlbWVudGF0aW9uIHNvIHRoYXQgU1NSIGd1YXJkcyBsaWtlIGB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ2Agd29ya1xuICogY29ycmVjdGx5IGFuZCBubyB1bmhhbmRsZWQgZXhjZXB0aW9ucyBhcmUgdGhyb3duLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVnaXN0ZXIoKTogUHJvbWlzZTx2b2lkPiB7XG4gIC8vIE9ubHkgcGF0Y2ggb24gdGhlIHNlcnZlciAoTm9kZS5qcykgc2lkZS5cbiAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSByZXR1cm47XG5cbiAgLy8gSWYgbG9jYWxTdG9yYWdlIGlzIGFscmVhZHkgaGVhbHRoeSwgbGVhdmUgaXQgYWxvbmUuXG4gIGlmIChcbiAgICB0eXBlb2YgZ2xvYmFsVGhpcy5sb2NhbFN0b3JhZ2UgIT09ICd1bmRlZmluZWQnICYmXG4gICAgdHlwZW9mIChnbG9iYWxUaGlzLmxvY2FsU3RvcmFnZSBhcyBTdG9yYWdlKS5nZXRJdGVtID09PSAnZnVuY3Rpb24nXG4gICkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIFByb3ZpZGUgYSBuby1vcCwgaW4tbWVtb3J5IGxvY2FsU3RvcmFnZSBzbyBTU1IgbmV2ZXIgdGhyb3dzLlxuICBjb25zdCBzdG9yZSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGdsb2JhbFRoaXMsICdsb2NhbFN0b3JhZ2UnLCB7XG4gICAgdmFsdWU6IHtcbiAgICAgIGdldEl0ZW06IChrZXk6IHN0cmluZyk6IHN0cmluZyB8IG51bGwgPT4gc3RvcmUuZ2V0KGtleSkgPz8gbnVsbCxcbiAgICAgIHNldEl0ZW06IChrZXk6IHN0cmluZywgdmFsdWU6IHN0cmluZyk6IHZvaWQgPT4geyBzdG9yZS5zZXQoa2V5LCBTdHJpbmcodmFsdWUpKTsgfSxcbiAgICAgIHJlbW92ZUl0ZW06IChrZXk6IHN0cmluZyk6IHZvaWQgPT4geyBzdG9yZS5kZWxldGUoa2V5KTsgfSxcbiAgICAgIGNsZWFyOiAoKTogdm9pZCA9PiB7IHN0b3JlLmNsZWFyKCk7IH0sXG4gICAgICBnZXQgbGVuZ3RoKCk6IG51bWJlciB7IHJldHVybiBzdG9yZS5zaXplOyB9LFxuICAgICAga2V5OiAobjogbnVtYmVyKTogc3RyaW5nIHwgbnVsbCA9PiBbLi4uc3RvcmUua2V5cygpXVtuXSA/PyBudWxsLFxuICAgIH0gc2F0aXNmaWVzIFN0b3JhZ2UsXG4gICAgd3JpdGFibGU6IHRydWUsXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICB9KTtcbn1cbiJdLCJuYW1lcyI6WyJyZWdpc3RlciIsImdsb2JhbFRoaXMiLCJsb2NhbFN0b3JhZ2UiLCJnZXRJdGVtIiwic3RvcmUiLCJNYXAiLCJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsInZhbHVlIiwia2V5IiwiZ2V0Iiwic2V0SXRlbSIsInNldCIsIlN0cmluZyIsInJlbW92ZUl0ZW0iLCJkZWxldGUiLCJjbGVhciIsImxlbmd0aCIsInNpemUiLCJuIiwia2V5cyIsIndyaXRhYmxlIiwiY29uZmlndXJhYmxlIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(instrument)/./src/instrumentation.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("./webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__("(instrument)/./src/instrumentation.ts"));
module.exports = __webpack_exports__;

})();