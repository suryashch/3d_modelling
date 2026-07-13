import * as THREE from 'three';

export class PerformanceGraphMonitor {
    constructor() {
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.timeWindow = 10000; 
        
        this.currentFps = 0;

        this.graphs = [
            { title: 'PERFORMANCE', metrics: [{ key: 'fps', color: '#00ff00', label: 'FPS' }] },
            { title: 'DRAW CALLS', metrics: [{ key: 'drawCalls', color: '#ff00ff', label: 'Calls' }] },
            { title: 'TRIANGLES', metrics: [{ key: 'triangles', color: '#00ffff', label: 'Tris' }] },
        ];

        this.history = {
            fps: [], drawCalls: [], triangles: [], memory: []
        };

        this.width = 300;
        this.graphHeight = 60;
        this.spacing = 30;
        this.height = (this.graphHeight + this.spacing) * this.graphs.length + 10;
        
        this.createUI();
    }

    createUI() {
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed; top: 10px; left: 10px;
            background: rgba(19, 20, 28, 0.85); backdrop-filter: blur(10px);
            border-radius: 4px; z-index: 1000; padding: 10px;
        `;
        
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext('2d');
        
        container.appendChild(this.canvas);
        document.body.appendChild(container);
    }

    update(renderer) {
        const now = performance.now();
        this.frameCount++;
        
        if (now >= this.lastTime + 1000) {
            this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
            this.frameCount = 0;
            this.lastTime = now;
        }

        const info = renderer.info;
        
        this.recordData(now, {
            fps: this.currentFps,
            drawCalls: info.render.calls,
            triangles: info.render.triangles,
            memory: performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0
        });

        this.render(now);
    }

    recordData(now, currentValues) {
        const cutoff = now - this.timeWindow;

        for (const key in this.history) {
            this.history[key].push({ t: now, v: currentValues[key] });
            
            while (this.history[key].length > 0 && this.history[key][0].t < cutoff) {
                this.history[key].shift();
            }
        }
    }

    render(now) {
        const { ctx, width, graphHeight, spacing } = this;
        ctx.clearRect(0, 0, width, this.height);
        ctx.font = '10px "Roboto Mono", monospace';

        this.graphs.forEach((graph, index) => {
            const startY = index * (graphHeight + spacing);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, startY + 15, width, graphHeight);

            let maxVal = 1;
            graph.metrics.forEach(m => {
                const arr = this.history[m.key];
                if (arr.length) maxVal = Math.max(maxVal, ...arr.map(d => d.v));
            });
            maxVal *= 1.1; 

            ctx.fillStyle = '#ffffff';
            ctx.fillText(graph.title, 0, startY + 10);

            let labelX = 80;
            graph.metrics.forEach((m) => {
                const arr = this.history[m.key];
                const currentV = arr.length ? arr[arr.length - 1].v : 0;
                const displayV = m.key === 'memory' ? currentV.toFixed(1) : currentV.toLocaleString();
                
                ctx.fillStyle = m.color;
                ctx.fillText(`${m.label}: ${displayV}`, labelX, startY + 10);
                labelX += 70;
            });

            graph.metrics.forEach((m) => {
                const arr = this.history[m.key];
                if (arr.length < 2) return;

                ctx.beginPath();
                ctx.strokeStyle = m.color;
                ctx.lineWidth = 1.5;

                arr.forEach((point, i) => {
                    const x = width - ((now - point.t) / this.timeWindow) * width;
                    const y = (startY + 15 + graphHeight) - ((point.v / maxVal) * graphHeight);

                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                
                ctx.stroke();
            });

            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillText(maxVal.toLocaleString(undefined, {maximumFractionDigits:0}), width - 40, startY + 25);
        });
    }
}