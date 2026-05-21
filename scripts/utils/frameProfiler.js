// code credited to Claude Opus

import * as THREE from 'three';

export class FrameProfiler {
  constructor(reportEveryNFrames = 60) {
    this.sections = new Map();          // name -> { total, count, max }
    this.reportEvery = reportEveryNFrames;
    this.frameCount = 0;
    this._marks = new Map();            // name -> start time
  }

  begin(name) {
    this._marks.set(name, performance.now());
  }

  end(name) {
    const start = this._marks.get(name);
    if (start === undefined) return;
    const dt = performance.now() - start;
    let s = this.sections.get(name);
    if (!s) {
      s = { total: 0, count: 0, max: 0 };
      this.sections.set(name, s);
    }
    s.total += dt;
    s.count += 1;
    if (dt > s.max) s.max = dt;
  }

  endFrame() {
    this.frameCount++;
    if (this.frameCount >= this.reportEvery) {
      this.report();
      this.frameCount = 0;
      for (const s of this.sections.values()) {
        s.total = 0; s.count = 0; s.max = 0;
      }
    }
  }

  report() {
    const rows = [];
    for (const [name, s] of this.sections) {
      rows.push({
        section: name,
        avg_ms: +(s.total / s.count).toFixed(3),
        max_ms: +s.max.toFixed(3),
        calls: s.count,
      });
    }
    rows.sort((a, b) => b.avg_ms - a.avg_ms);
    console.table(rows);
  }
};