export default {
    name: 'Choreographing',
    label: 'choreographing',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Formation dot positions in a star/dance pattern
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        this._dotPositions = [];
        // Create a star-like formation with 12 dots
        for (var i = 0; i < 12; i++) {
            var angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
            var radius = (i % 2 === 0) ? 0.5 : 0.25;
            this._dotPositions.push({
                x: ox + Math.cos(angle) * radius,
                y: oy + Math.sin(angle) * radius * 0.7
            });
        }

        // Formation dot spheres
        this._dots = [];
        var dotGeo = new THREE.SphereGeometry(0.025, 8, 8);
        for (var j = 0; j < 12; j++) {
            var dMat = new THREE.MeshBasicMaterial({
                color: 0x445566, transparent: true, opacity: 0,
                depthWrite: false
            });
            var dot = new THREE.Mesh(dotGeo, dMat);
            dot.position.set(this._dotPositions[j].x, this._dotPositions[j].y, 0);
            dot.visible = false;
            scene.add(dot);
            this._dots.push({ mesh: dot, visited: false, litUp: false, glowMat: null, glowMesh: null });
        }

        // Glow meshes for lit-up dots
        var glowGeo = new THREE.SphereGeometry(0.04, 8, 8);
        for (var k = 0; k < 12; k++) {
            var gMat = new THREE.MeshBasicMaterial({
                color: 0x44ddff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var glow = new THREE.Mesh(glowGeo, gMat);
            glow.position.set(this._dotPositions[k].x, this._dotPositions[k].y, 0);
            glow.visible = false;
            scene.add(glow);
            this._dots[k].glowMat = gMat;
            this._dots[k].glowMesh = glow;
        }

        // Connection line geometries between visited dots
        this._connections = [];
        // Maximum 12 connections (one per pair of consecutive visited dots)
        for (var m = 0; m < 12; m++) {
            var lineMat = new THREE.MeshBasicMaterial({
                color: 0x22aadd, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var lineGeo = new THREE.BoxGeometry(1, 0.006, 0.006);
            var lineMesh = new THREE.Mesh(lineGeo, lineMat);
            lineMesh.visible = false;
            scene.add(lineMesh);
            this._connections.push({ mesh: lineMesh, active: false });
        }

        this._visitOrder = [0, 2, 4, 6, 8, 10, 1, 3, 5, 7, 9, 11];
        this._visited = 0;
        this._currentTarget = 0;
    },
    _connectDots(idx, fromX, fromY, toX, toY) {
        if (idx >= this._connections.length) return;
        var conn = this._connections[idx];
        var dx = toX - fromX;
        var dy = toY - fromY;
        var len = Math.sqrt(dx * dx + dy * dy);
        var angle = Math.atan2(dy, dx);

        conn.mesh.visible = true;
        conn.mesh.position.set((fromX + toX) / 2, (fromY + toY) / 2, 0);
        conn.mesh.rotation.z = angle;
        conn.mesh.scale.x = len;
        conn.mesh.material.opacity = 0.5;
        conn.active = true;
    },
    _lightUpDot(idx) {
        var dot = this._dots[idx];
        if (dot.litUp) return;
        dot.litUp = true;
        dot.mesh.material.color.setHex(0x44ddff);
        dot.mesh.material.opacity = 0.9;
        dot.glowMesh.visible = true;
        dot.glowMat.opacity = 0.6;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;
        var dotPos = this._dotPositions;
        var order = this._visitOrder;

        if (progress < 0.12) {
            // Dots appear as diagram (fade in one by one)
            var t = progress / 0.12;
            var dotsToShow = Math.floor(t * 12);
            for (var di = 0; di < 12; di++) {
                if (di <= dotsToShow) {
                    this._dots[di].mesh.visible = true;
                    var dotFade = di < dotsToShow ? 0.5 : (t * 12 - di) * 0.5;
                    this._dots[di].mesh.material.opacity = dotFade;
                    // Subtle pulse as they appear
                    this._dots[di].mesh.scale.setScalar(0.8 + Math.sin(time * 4 + di) * 0.1);
                }
            }
            model.position.copy(orig);
        } else if (progress < 0.40) {
            // Model visits first positions (even-numbered dots: 0,2,4,6,8,10)
            var t2 = (progress - 0.12) / 0.28;
            var totalFirst = 6;
            var segP = t2 * totalFirst;
            var segIdx = Math.min(Math.floor(segP), totalFirst - 1);
            var segT = segP - segIdx;

            var targetDotIdx = order[segIdx];
            var nextDotIdx = segIdx + 1 < totalFirst ? order[segIdx + 1] : order[segIdx];

            // Move model toward current target
            var fromPos = segIdx === 0 ? { x: orig.x, y: orig.y } : dotPos[order[segIdx - 1]];
            if (segIdx === 0 && segT < 0.5) {
                fromPos = { x: orig.x, y: orig.y };
            } else if (segIdx > 0) {
                fromPos = dotPos[order[segIdx - 1]];
            }
            var toPos = dotPos[targetDotIdx];

            var mx = fromPos.x + (toPos.x - fromPos.x) * Math.min(segT * 1.3, 1);
            var my = fromPos.y + (toPos.y - fromPos.y) * Math.min(segT * 1.3, 1);
            // Arc up between points
            var arcH = Math.sin(Math.min(segT * 1.3, 1) * Math.PI) * 0.08;
            model.position.set(mx, my + arcH, orig.z);
            model.rotation.z = Math.sin(time * 5) * 0.05;
            model.scale.setScalar(gs);

            // Light up dots and connect when reaching them
            if (segT > 0.7) {
                this._lightUpDot(targetDotIdx);
                if (segIdx > 0) {
                    var prevDot = order[segIdx - 1];
                    this._connectDots(segIdx - 1, dotPos[prevDot].x, dotPos[prevDot].y, dotPos[targetDotIdx].x, dotPos[targetDotIdx].y);
                } else {
                    this._connectDots(0, orig.x, orig.y, dotPos[targetDotIdx].x, dotPos[targetDotIdx].y);
                }
                this._visited = Math.max(this._visited, segIdx + 1);
            }

            // Keep all dots visible
            for (var di2 = 0; di2 < 12; di2++) {
                this._dots[di2].mesh.visible = true;
                if (!this._dots[di2].litUp) {
                    this._dots[di2].mesh.material.opacity = 0.3 + Math.sin(time * 2 + di2) * 0.05;
                }
            }
        } else if (progress < 0.70) {
            // Faster movement, visiting odd-numbered dots (1,3,5,7,9,11)
            var t3 = (progress - 0.40) / 0.30;
            var totalSecond = 6;
            var segP2 = t3 * totalSecond;
            var segIdx2 = Math.min(Math.floor(segP2), totalSecond - 1);
            var segT2 = segP2 - segIdx2;

            var actualIdx = 6 + segIdx2;
            var targetDotIdx2 = order[actualIdx];
            var prevIdx2 = actualIdx > 0 ? order[actualIdx - 1] : order[5];
            var fromPos2 = dotPos[prevIdx2];
            var toPos2 = dotPos[targetDotIdx2];

            // Faster, more direct movement
            var easedT = segT2 < 0.5 ? 2 * segT2 * segT2 : 1 - Math.pow(-2 * segT2 + 2, 2) / 2;
            var mx2 = fromPos2.x + (toPos2.x - fromPos2.x) * easedT;
            var my2 = fromPos2.y + (toPos2.y - fromPos2.y) * easedT;
            var arcH2 = Math.sin(easedT * Math.PI) * 0.06;
            model.position.set(mx2, my2 + arcH2, orig.z);
            model.rotation.z = Math.sin(time * 8) * 0.08;

            if (segT2 > 0.6) {
                this._lightUpDot(targetDotIdx2);
                this._connectDots(5 + segIdx2, fromPos2.x, fromPos2.y, toPos2.x, toPos2.y);
                this._visited = Math.max(this._visited, actualIdx + 1);
            }

            // All dots visible
            for (var di3 = 0; di3 < 12; di3++) {
                this._dots[di3].mesh.visible = true;
                if (!this._dots[di3].litUp) {
                    this._dots[di3].mesh.material.opacity = 0.3;
                }
            }
        } else if (progress < 0.85) {
            // All dots connected, pattern pulses
            var t4 = (progress - 0.70) / 0.15;
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.setScalar(gs);

            // Light up any remaining dots
            for (var li = 0; li < 12; li++) {
                this._lightUpDot(li);
            }

            // Pulse the whole pattern
            var pulse = 0.5 + Math.sin(time * 6) * 0.3;
            var colorPulse = Math.sin(time * 3);

            for (var pi = 0; pi < 12; pi++) {
                var d = this._dots[pi];
                d.mesh.material.opacity = 0.7 + Math.sin(time * 4 + pi * 0.5) * 0.2;
                d.glowMat.opacity = pulse;
                d.glowMesh.scale.setScalar(1 + Math.sin(time * 5 + pi) * 0.2);
                // Color shift through the pattern
                var hue = ((time * 0.2 + pi / 12) % 1.0);
                d.mesh.material.color.setHSL(hue, 0.8, 0.6);
                d.glowMat.color.setHSL(hue, 0.9, 0.5);
            }

            for (var ci = 0; ci < this._connections.length; ci++) {
                if (this._connections[ci].active) {
                    this._connections[ci].mesh.material.opacity = 0.3 + pulse * 0.3;
                    var cHue = ((time * 0.2 + ci / 12) % 1.0);
                    this._connections[ci].mesh.material.color.setHSL(cHue, 0.9, 0.5);
                }
            }
        } else {
            // Pattern fades, model centers
            var t5 = (progress - 0.85) / 0.15;
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            var fadeOut = 1 - t5;
            for (var fi = 0; fi < 12; fi++) {
                this._dots[fi].mesh.material.opacity = 0.7 * fadeOut;
                this._dots[fi].glowMat.opacity = 0.5 * fadeOut;
                if (t5 > 0.9) {
                    this._dots[fi].mesh.visible = false;
                    this._dots[fi].glowMesh.visible = false;
                }
            }
            for (var fci = 0; fci < this._connections.length; fci++) {
                if (this._connections[fci].active) {
                    this._connections[fci].mesh.material.opacity = 0.5 * fadeOut;
                    if (t5 > 0.9) this._connections[fci].mesh.visible = false;
                }
            }
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._dots) {
            this._dots.forEach(function(d) {
                scene.remove(d.mesh);
                d.mesh.geometry.dispose();
                d.mesh.material.dispose();
                if (d.glowMesh) {
                    scene.remove(d.glowMesh);
                    d.glowMesh.geometry.dispose();
                    d.glowMat.dispose();
                }
            });
        }
        if (this._connections) {
            this._connections.forEach(function(c) {
                scene.remove(c.mesh);
                c.mesh.geometry.dispose();
                c.mesh.material.dispose();
            });
        }
        this._dots = this._connections = this._dotPositions = this._visitOrder = null;
    }
};
