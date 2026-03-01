export default {
    name: 'Inferring',
    label: 'inferring',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // 12 evidence data point spheres scattered
        this._evidence = [];
        var evColors = [0x44bbff, 0x66ddaa, 0xffaa44, 0xff6688, 0xaa66ff, 0x88ddff,
                        0x55cc88, 0xffcc55, 0xff7799, 0xbb77ff, 0x44ddcc, 0xff8855];
        var evGeo = new THREE.SphereGeometry(0.022, 7, 7);
        for (var i = 0; i < 12; i++) {
            var evMat = new THREE.MeshBasicMaterial({
                color: evColors[i],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ev = new THREE.Mesh(evGeo, evMat);
            ev.visible = false;
            scene.add(ev);

            var a = (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            var d = 0.2 + Math.random() * 0.2;
            this._evidence.push({
                mesh: ev,
                x: ox + Math.cos(a) * d,
                y: oy + 0.1 + Math.sin(a) * d * 0.6,
                connected: false,
                appearTime: 0.02 + i * 0.04
            });
        }

        // Dotted connection lines between related evidence
        this._connections = [];
        var connPairs = [[0,3],[1,4],[2,5],[3,7],[4,8],[5,9],[6,10],[7,11],[0,6],[1,7],[2,8],[9,11],[10,0],[3,6],[5,11]];
        for (var c = 0; c < connPairs.length; c++) {
            // Build dotted line as multiple small segments
            var dotCount = 6;
            var dotPts = [];
            for (var d2 = 0; d2 < dotCount * 2; d2++) {
                dotPts.push(new THREE.Vector3(0, 0, 0));
            }
            var connGeo = new THREE.BufferGeometry().setFromPoints(dotPts);
            var connMat = new THREE.LineBasicMaterial({
                color: 0x66aaff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending
            });
            var connLine = new THREE.LineSegments(connGeo, connMat);
            connLine.visible = false;
            scene.add(connLine);
            this._connections.push({
                line: connLine,
                from: connPairs[c][0],
                to: connPairs[c][1],
                dotCount: dotCount,
                drawn: false,
                drawTime: 0.25 + c * 0.04
            });
        }

        // Pattern trace particles (following model's tracing)
        this._traceParticles = [];
        var trGeo = new THREE.SphereGeometry(0.01, 5, 5);
        for (var t = 0; t < 15; t++) {
            var trMat = new THREE.MeshBasicMaterial({
                color: t % 2 === 0 ? 0xaaddff : 0xffddaa,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var tr = new THREE.Mesh(trGeo, trMat);
            tr.visible = false;
            scene.add(tr);
            this._traceParticles.push({
                mesh: tr,
                life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._traceIdx = 0;

        // Conclusion sphere (where lines converge)
        var conclusionGeo = new THREE.SphereGeometry(0.07, 10, 10);
        var conclusionMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._conclusion = new THREE.Mesh(conclusionGeo, conclusionMat);
        this._conclusion.position.set(ox, oy + 0.1, 0.03);
        this._conclusion.visible = false;
        scene.add(this._conclusion);

        // Inference glow
        var infGeo = new THREE.SphereGeometry(0.35, 12, 12);
        var infMat = new THREE.MeshBasicMaterial({
            color: 0x6699ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._inferGlow = new THREE.Mesh(infGeo, infMat);
        this._inferGlow.position.set(ox, oy + 0.1, -0.03);
        scene.add(this._inferGlow);

        this._lastTrace = 0;
    },
    _updateConnectionGeometry(conn, fromX, fromY, toX, toY) {
        var positions = conn.line.geometry.attributes.position;
        for (var d = 0; d < conn.dotCount; d++) {
            var t1 = (d / conn.dotCount) + 0.02;
            var t2 = (d / conn.dotCount) + (1 / conn.dotCount) - 0.04;
            positions.setXYZ(d * 2, fromX + (toX - fromX) * t1, fromY + (toY - fromY) * t1, 0.015);
            positions.setXYZ(d * 2 + 1, fromX + (toX - fromX) * t2, fromY + (toY - fromY) * t2, 0.015);
        }
        positions.needsUpdate = true;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.12) {
            // Phase 1: Evidence dots appear scattered
            var t = progress / 0.12;
            for (var i = 0; i < 12; i++) {
                var ev = this._evidence[i];
                if (t > ev.appearTime) {
                    ev.mesh.visible = true;
                    var fade = Math.min(1, (t - ev.appearTime) * 5);
                    ev.mesh.material.opacity = fade * 0.7;
                    ev.mesh.position.set(ev.x, ev.y + Math.sin(time * 2 + i) * 0.003, 0.02);
                    ev.mesh.scale.setScalar(fade);
                }
            }
            model.position.set(ox, oy, oz);
        } else if (progress < 0.50) {
            // Phase 2: Connection lines draw between related points
            var t2 = (progress - 0.12) / 0.38;

            for (var ei = 0; ei < 12; ei++) {
                var ev2 = this._evidence[ei];
                ev2.mesh.material.opacity = 0.7 + Math.sin(time * 3 + ei) * 0.1;
                ev2.mesh.position.y = ev2.y + Math.sin(time * 1.5 + ei * 0.5) * 0.004;
            }

            // Draw connections progressively
            for (var ci = 0; ci < this._connections.length; ci++) {
                var conn = this._connections[ci];
                if (t2 > conn.drawTime && !conn.drawn) {
                    conn.drawn = true;
                    conn.line.visible = true;
                }
                if (conn.drawn) {
                    var fromEv = this._evidence[conn.from];
                    var toEv = this._evidence[conn.to];
                    this._updateConnectionGeometry(conn, fromEv.mesh.position.x, fromEv.mesh.position.y,
                        toEv.mesh.position.x, toEv.mesh.position.y);
                    var drawProg = Math.min(1, (t2 - conn.drawTime) * 4);
                    conn.line.material.opacity = drawProg * 0.3;
                }
            }

            // Model traces pattern
            if (time - this._lastTrace > 0.2 && t2 > 0.3) {
                var tp = this._traceParticles[this._traceIdx % this._traceParticles.length];
                this._traceIdx++;
                tp.mesh.visible = true;
                var traceAngle = time * 1.5;
                var traceDist = 0.15 + Math.sin(time * 0.8) * 0.1;
                tp.mesh.position.set(ox + Math.cos(traceAngle) * traceDist, oy + 0.1 + Math.sin(traceAngle) * traceDist * 0.6, 0.04);
                tp.life = 0.4 + Math.random() * 0.3;
                tp.maxLife = tp.life;
                tp.vx = (Math.random() - 0.5) * 0.1;
                tp.vy = 0.1 + Math.random() * 0.1;
                tp.mesh.material.opacity = 0.6;
                this._lastTrace = time;
            }

            model.position.set(ox + Math.sin(time * 0.8) * 0.01, oy + Math.sin(time * 1.2) * 0.005, oz);
            model.rotation.z = Math.sin(time * 0.6) * 0.02;
        } else if (progress < 0.72) {
            // Phase 3: Pattern emerges, connections brighten
            var t3 = (progress - 0.50) / 0.22;

            for (var ej = 0; ej < 12; ej++) {
                this._evidence[ej].mesh.material.opacity = 0.8 + Math.sin(time * 4 + ej) * 0.1;
            }

            for (var cj = 0; cj < this._connections.length; cj++) {
                if (this._connections[cj].drawn) {
                    this._connections[cj].line.material.opacity = 0.3 + t3 * 0.3;
                    this._connections[cj].line.material.color.setHex(0x88ccff);
                    var fromEv2 = this._evidence[this._connections[cj].from];
                    var toEv2 = this._evidence[this._connections[cj].to];
                    this._updateConnectionGeometry(this._connections[cj],
                        fromEv2.mesh.position.x, fromEv2.mesh.position.y,
                        toEv2.mesh.position.x, toEv2.mesh.position.y);
                }
            }

            this._inferGlow.material.opacity = t3 * 0.08;

            model.position.set(ox, oy + Math.sin(time * 1.5) * 0.005, oz);
            model.rotation.z = Math.sin(time * 0.8) * 0.015;
        } else if (progress < 0.85) {
            // Phase 4: Conclusion sphere materializes where lines converge
            var t4 = (progress - 0.72) / 0.13;
            this._conclusion.visible = true;
            this._conclusion.material.opacity = t4 * 0.8;
            this._conclusion.scale.setScalar(t4 * 1.2);

            this._inferGlow.material.opacity = 0.08 + t4 * 0.12;
            this._inferGlow.scale.setScalar(1 + t4 * 0.3);

            for (var ck = 0; ck < this._connections.length; ck++) {
                if (this._connections[ck].drawn) {
                    this._connections[ck].line.material.opacity = 0.6 + Math.sin(time * 5 + ck) * 0.1;
                }
            }

            model.position.set(ox, oy + 0.005, oz);
            model.rotation.z = 0;
        } else {
            // Phase 5: Fade out
            var t5 = (progress - 0.85) / 0.15;
            this._conclusion.material.opacity = 0.8 * (1 - t5);
            this._inferGlow.material.opacity = 0.2 * (1 - t5);

            for (var el = 0; el < 12; el++) {
                this._evidence[el].mesh.material.opacity = 0.8 * (1 - t5);
            }
            for (var cl2 = 0; cl2 < this._connections.length; cl2++) {
                this._connections[cl2].line.material.opacity *= (1 - t5 * 0.05);
            }

            model.position.set(ox, oy + 0.005 * (1 - t5), oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update trace particles
        for (var ti = 0; ti < this._traceParticles.length; ti++) {
            var tp2 = this._traceParticles[ti];
            if (tp2.life <= 0) continue;
            tp2.life -= delta;
            if (tp2.life <= 0) { tp2.mesh.visible = false; continue; }
            tp2.mesh.position.x += tp2.vx * delta;
            tp2.mesh.position.y += tp2.vy * delta;
            var lr = tp2.life / tp2.maxLife;
            tp2.mesh.material.opacity = lr * 0.5;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._evidence) {
            this._evidence.forEach(function(e) {
                scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose();
            });
        }
        if (this._connections) {
            this._connections.forEach(function(c) {
                scene.remove(c.line); c.line.geometry.dispose(); c.line.material.dispose();
            });
        }
        if (this._traceParticles) {
            this._traceParticles.forEach(function(t) {
                scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose();
            });
        }
        if (this._conclusion) { scene.remove(this._conclusion); this._conclusion.geometry.dispose(); this._conclusion.material.dispose(); }
        if (this._inferGlow) { scene.remove(this._inferGlow); this._inferGlow.geometry.dispose(); this._inferGlow.material.dispose(); }
        this._evidence = this._connections = this._traceParticles = this._conclusion = this._inferGlow = null;
    }
};
