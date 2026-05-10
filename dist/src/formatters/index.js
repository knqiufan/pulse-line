"use strict";
// src/formatters/index.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderLayout = exports.renderSegment = exports.renderSeparator = exports.formatDuration = exports.getProgressColor = exports.renderProgressBar = void 0;
var progress_bar_1 = require("./progress-bar");
Object.defineProperty(exports, "renderProgressBar", { enumerable: true, get: function () { return progress_bar_1.renderProgressBar; } });
Object.defineProperty(exports, "getProgressColor", { enumerable: true, get: function () { return progress_bar_1.getProgressColor; } });
var duration_1 = require("./duration");
Object.defineProperty(exports, "formatDuration", { enumerable: true, get: function () { return duration_1.formatDuration; } });
var separator_1 = require("./separator");
Object.defineProperty(exports, "renderSeparator", { enumerable: true, get: function () { return separator_1.renderSeparator; } });
var segment_1 = require("./segment");
Object.defineProperty(exports, "renderSegment", { enumerable: true, get: function () { return segment_1.renderSegment; } });
var layout_1 = require("./layout");
Object.defineProperty(exports, "renderLayout", { enumerable: true, get: function () { return layout_1.renderLayout; } });
//# sourceMappingURL=index.js.map