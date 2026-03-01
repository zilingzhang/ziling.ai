export default {
    name: 'Scheming',
    label: 'scheming',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // 8 grid lines (4 horizontal + 4 vertical) like graph paper
        this._gridLines = [];
        var gridExtent = 0.6;
        var gridSpacing = 0.3;
        for (var i = 0; i < 4; i++) {
            // Horizontal line
            var hPoints = [
                new THREE.Vector3(ox - gridExtent, oy - 0.3 + i * gridSpacing * 0.6, -0.05),
                new THREE.Vector3(ox + gridExtent, oy - 0.3 + i * gridSpacing * 0.6, -0.05)
            ];
            var hGeo = new THREE.BufferGeometry().setFromPoints(hPoints);
            var hMat = new THREE.LineBasicMaterial({
                color: 0x22aa88, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending
            });
            var hLine = new THREE.Line(hGeo, hMat);
            hLine.visible = false;
            scene.add(hLine);
            this._gridLines.push({ line: hLine, type: 'h', idx: i });

            // Vertical line
            var vPoints = [
                new THREE.Vector3(ox - 0.45 + i * gridSpacing, oy - 0.4, -0.05),
                new THREE.Vector3(ox - 0.45 + i * gridSpacing, oy + 0.4, -0.05)
            ];
            var vGeo = new THREE.BufferGeometry().setFromPoints(vPoints);
            var vMat = new THREE.LineBasicMaterial({
                color: 0x22aa88, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending
            });
            var vLine = new THREE.Line(vGeo, vMat);
            vLine.visible = false;
            scene.add(vLine);
            this._gridLines.push({ line: vLine, type: 'v', idx: i });
        }

        // 8 scheme piece shapes (small cubes placed on grid intersections)
        this._pieces = [];
        var pieceGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
        var pieceColors = [0x44ffaa, 0x22ddcc, 0x66ff88, 0x44cc88,
                           0x88ffcc, 0x33eeaa, 0x55dd99, 0x77ffbb];
        // Grid intersection positions
        var gridPositions = [
            { x: ox - 0.45, y: oy - 0.3 },
            { x: ox - 0.15, y: oy + 0.06 },
            { x: ox + 0.15, y: oy - 0.12 },
            { x: ox + 0.45, y: oy + 0.24 },
            { x: ox - 0.30, y: oy + 0.24 },
            { x: ox + 0.30, y: oy - 0.3 },
            { x: ox, y: oy + 0.24 },
            { x: ox - 0.45, y: oy + 0.06 }
        ];
        // Start positions (off grid, will animate to grid)
        var startPositions = [
            { x: ox - 0.1, y: oy + 0.5 },
            { x: ox + 0.2, y: oy + 0.4 },
            { x: ox - 0.3, y: oy + 0.6 },
            { x: ox + 0.4, y: oy + 0.5 },
            { x: ox, y: oy + 0.45 },
            { x: ox + 0.1, y: oy + 0.55 },
            { x: ox - 0.2, y: oy + 0.5 },
            { x: ox + 0.3, y: oy + 0.45 }
        ];
        for (var j = 0; j < 8; j++) {
            var pMat = new THREE.MeshBasicMaterial({
                color: pieceColors[j],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var piece = new THREE.Mesh(pieceGeo, pMat);
            piece.position.set(startPositions[j].x, startPositions[j].y, 0);
            piece.visible = false;
            scene.add(piece);
            this._pieces.push({
                mesh: piece,
                startX: startPositions[j].x,
                startY: startPositions[j].y,
                targetX: gridPositions[j].x,
                targetY: gridPositions[j].y,
                placed: false,
                placeStart: 0.10 + j * 0.018,
                placeEnd: 0.10 + j * 0.018 + 0.08
            });
        }

        // 12 connection line geometries between pieces
        this._connections = [];
        var connectionPairs = [
            [0, 1], [1, 2], [2, 3], [3, 6],
            [4, 6], [4, 1], [5, 2], [5, 3],
            [0, 7], [7, 4], [1, 6], [2, 5]
        ];
        for (var k = 0; k < 12; k++) {
            var cMat = new THREE.LineBasicMaterial({
                color: k % 3 === 0 ? 0x44ffcc : (k % 3 === 1 ? 0x88ff88 : 0x22ddaa),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending
            });
            var cPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];
            var cGeo = new THREE.BufferGeometry().setFromPoints(cPoints);
            var cLine = new THREE.Line(cGeo, cMat);
            cLine.visible = false;
            scene.add(cLine);
            this._connections.push({
                line: cLine,
                fromIdx: connectionPairs[k][0],
                toIdx: connectionPairs[k][1],
                drawProgress: 0
            });
        }

        // Network pulse glow
        var pulseGeo = new THREE.SphereGeometry(0.5, 14, 14);
        var pulseMat = new THREE.MeshBasicMaterial({
            color: 0x22cc88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._pulseGlow = new THREE.Mesh(pulseGeo, pulseMat);
        this._pulseGlow.position.set(ox, oy, -0.1);
        scene.add(this._pulseGlow);
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.10) {
            // Phase 1: Grid lines appear
            var t = progress / 0.10;
            for (var gi = 0; gi < this._gridLines.length; gi++) {
                var gl = this._gridLines[gi];
                var glDelay = gi * 0.08;
                if (t > glDelay) {
                    gl.line.visible = true;
                    gl.line.material.opacity = Math.min(0.25, (t - glDelay) * 1.5);
                }
            }
            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.25) {
            // Phase 2: First pieces placed on grid
            var t2 = (progress - 0.10) / 0.15;

            // Grid fully visible
            for (var gj = 0; gj < this._gridLines.length; gj++) {
                this._gridLines[gj].line.visible = true;
                this._gridLines[gj].line.material.opacity = 0.25 + Math.sin(time * 2 + gj) * 0.05;
            }

            // Place pieces
            for (var pi = 0; pi < this._pieces.length; pi++) {
                var p = this._pieces[pi];
                if (progress >= p.placeStart && progress < p.placeEnd) {
                    var placeT = (progress - p.placeStart) / (p.placeEnd - p.placeStart);
                    var ease = placeT * placeT * (3 - 2 * placeT);
                    p.mesh.visible = true;
                    p.mesh.position.set(
                        p.startX + (p.targetX - p.startX) * ease,
                        p.startY + (p.targetY - p.startY) * ease,
                        0.02
                    );
                    p.mesh.material.opacity = ease * 0.7;
                    p.mesh.rotation.y += delta * 3;
                } else if (progress >= p.placeEnd) {
                    p.mesh.visible = true;
                    p.mesh.position.set(p.targetX, p.targetY, 0.02);
                    p.mesh.material.opacity = 0.7;
                    p.placed = true;
                }
            }

            // Model watches, slight shifts
            model.position.set(ox + 0.15, oy + Math.sin(time * 1.5) * 0.005, oz);
            model.rotation.z = Math.sin(time * 0.8) * 0.02;
        } else if (progress < 0.55) {
            // Phase 3: Pieces move strategically, connections form
            var t3 = (progress - 0.25) / 0.30;

            // All pieces placed, gently pulse
            for (var pj = 0; pj < this._pieces.length; pj++) {
                var p2 = this._pieces[pj];
                p2.mesh.visible = true;
                p2.mesh.position.set(p2.targetX, p2.targetY, 0.02);
                p2.mesh.material.opacity = 0.7 + Math.sin(time * 3 + pj) * 0.1;
                p2.mesh.rotation.y += delta * 1.5;
                p2.mesh.scale.setScalar(1 + Math.sin(time * 2 + pj * 0.5) * 0.1);
            }

            // Connections draw in progressively
            for (var ci = 0; ci < this._connections.length; ci++) {
                var conn = this._connections[ci];
                var connStart = ci * 0.07;
                if (t3 > connStart) {
                    conn.line.visible = true;
                    conn.drawProgress = Math.min(1, (t3 - connStart) / 0.12);

                    var fromP = this._pieces[conn.fromIdx];
                    var toP = this._pieces[conn.toIdx];
                    var positions = conn.line.geometry.attributes.position;
                    positions.setXYZ(0, fromP.targetX, fromP.targetY, 0.01);
                    var endX = fromP.targetX + (toP.targetX - fromP.targetX) * conn.drawProgress;
                    var endY = fromP.targetY + (toP.targetY - fromP.targetY) * conn.drawProgress;
                    positions.setXYZ(1, endX, endY, 0.01);
                    positions.needsUpdate = true;

                    conn.line.material.opacity = conn.drawProgress * 0.5;
                }
            }

            // Grid pulses
            for (var gk = 0; gk < this._gridLines.length; gk++) {
                this._gridLines[gk].line.material.opacity = 0.2 + Math.sin(time * 1.5 + gk * 0.3) * 0.05;
            }

            model.position.set(ox + 0.15, oy + Math.sin(time * 1) * 0.005, oz);
            model.rotation.z = Math.sin(time * 0.6) * 0.02;
        } else if (progress < 0.72) {
            // Phase 4: Web of connections complete, pulses
            var t4 = (progress - 0.55) / 0.17;

            // All connections fully drawn, pulsing
            for (var cj = 0; cj < this._connections.length; cj++) {
                var conn2 = this._connections[cj];
                conn2.line.visible = true;
                var fromP2 = this._pieces[conn2.fromIdx];
                var toP2 = this._pieces[conn2.toIdx];
                var positions2 = conn2.line.geometry.attributes.position;
                positions2.setXYZ(0, fromP2.targetX, fromP2.targetY, 0.01);
                positions2.setXYZ(1, toP2.targetX, toP2.targetY, 0.01);
                positions2.needsUpdate = true;

                // Pulse effect - brightness wave through network
                var pulseWave = Math.sin(time * 4 + cj * 0.5);
                conn2.line.material.opacity = 0.4 + pulseWave * 0.2;
            }

            // Pieces glow brighter
            for (var pk = 0; pk < this._pieces.length; pk++) {
                var p3 = this._pieces[pk];
                p3.mesh.material.opacity = 0.8 + Math.sin(time * 3 + pk * 0.7) * 0.15;
                p3.mesh.scale.setScalar(1 + Math.sin(time * 2.5 + pk) * 0.15);
            }

            model.position.set(ox + 0.15, oy, oz);
            model.rotation.z = 0;
        } else if (progress < 0.85) {
            // Phase 5: Scheme activates - bright pulse through network
            var t5 = (progress - 0.72) / 0.13;
            var activePulse = Math.sin(t5 * Math.PI);

            // Network pulse glow
            this._pulseGlow.material.opacity = activePulse * 0.2;
            this._pulseGlow.scale.setScalar(1 + activePulse * 0.5);

            // Connections flash bright
            for (var ck = 0; ck < this._connections.length; ck++) {
                var conn3 = this._connections[ck];
                var flashDelay = ck * 0.06;
                var flashT = Math.max(0, t5 - flashDelay);
                var flashPulse = Math.sin(flashT * Math.PI * 3) * 0.3;
                conn3.line.material.opacity = 0.5 + flashPulse;
                conn3.line.material.color.setHex(flashT > 0.3 ? 0x88ffdd : 0x44ffcc);
            }

            // Pieces flash
            for (var pl = 0; pl < this._pieces.length; pl++) {
                this._pieces[pl].mesh.material.opacity = 0.9 + activePulse * 0.1;
                this._pieces[pl].mesh.scale.setScalar(1.1 + activePulse * 0.2);
            }

            model.position.set(ox + 0.15 * (1 - t5 * 0.3), oy, oz);
        } else {
            // Phase 6: Fade out
            var t6 = (progress - 0.85) / 0.15;

            // Everything fades
            for (var gl2 = 0; gl2 < this._gridLines.length; gl2++) {
                this._gridLines[gl2].line.material.opacity = 0.2 * (1 - t6);
            }
            for (var pm = 0; pm < this._pieces.length; pm++) {
                this._pieces[pm].mesh.material.opacity = 0.8 * (1 - t6);
                if (this._pieces[pm].mesh.material.opacity < 0.01) this._pieces[pm].mesh.visible = false;
            }
            for (var cl = 0; cl < this._connections.length; cl++) {
                this._connections[cl].line.material.opacity = 0.5 * (1 - t6);
                if (this._connections[cl].line.material.opacity < 0.01) this._connections[cl].line.visible = false;
            }
            this._pulseGlow.material.opacity = 0.1 * (1 - t6);

            model.position.set(ox + 0.15 * (1 - t6), oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._gridLines) {
            this._gridLines.forEach(function(g) {
                scene.remove(g.line); g.line.geometry.dispose(); g.line.material.dispose();
            });
        }
        if (this._pieces) {
            this._pieces.forEach(function(p) {
                scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose();
            });
        }
        if (this._connections) {
            this._connections.forEach(function(c) {
                scene.remove(c.line); c.line.geometry.dispose(); c.line.material.dispose();
            });
        }
        if (this._pulseGlow) { scene.remove(this._pulseGlow); this._pulseGlow.geometry.dispose(); this._pulseGlow.material.dispose(); }
        this._gridLines = this._pieces = this._connections = this._pulseGlow = null;
    }
};
