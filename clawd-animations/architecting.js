export default {
    name: 'Architecting',
    label: 'architecting',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Blueprint grid - horizontal and vertical lines
        this._gridLines = [];
        var gridMat = new THREE.LineBasicMaterial({
            color: 0x2244aa, transparent: true, opacity: 0
        });
        for (var i = 0; i < 8; i++) {
            var pts = [];
            // Horizontal lines
            pts.push(new THREE.Vector3(ox - 0.5, oy - 0.35 + i * 0.1, -0.05));
            pts.push(new THREE.Vector3(ox + 0.3, oy - 0.35 + i * 0.1, -0.05));
            var lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
            var line = new THREE.Line(lineGeo, gridMat.clone());
            line.visible = false;
            scene.add(line);
            this._gridLines.push(line);
        }
        for (var j = 0; j < 9; j++) {
            var pts2 = [];
            pts2.push(new THREE.Vector3(ox - 0.5 + j * 0.1, oy - 0.35, -0.05));
            pts2.push(new THREE.Vector3(ox - 0.5 + j * 0.1, oy + 0.35, -0.05));
            var lineGeo2 = new THREE.BufferGeometry().setFromPoints(pts2);
            var line2 = new THREE.Line(lineGeo2, gridMat.clone());
            line2.visible = false;
            scene.add(line2);
            this._gridLines.push(line2);
        }

        // Foundation blocks (3 flat boxes)
        this._foundations = [];
        for (var fi = 0; fi < 3; fi++) {
            var fGeo = new THREE.BoxGeometry(0.12, 0.04, 0.06);
            var fMat = new THREE.MeshBasicMaterial({
                color: 0x887766, transparent: true, opacity: 0
            });
            var fBlock = new THREE.Mesh(fGeo, fMat);
            fBlock.position.set(ox - 0.2 + fi * 0.12, oy - 0.3, 0);
            fBlock.visible = false;
            scene.add(fBlock);
            this._foundations.push(fBlock);
        }

        // Wall segments (boxes that grow upward)
        this._walls = [];
        var wallPositions = [
            { x: ox - 0.26, startY: oy - 0.28, height: 0.25 },
            { x: ox + 0.02, startY: oy - 0.28, height: 0.25 },
            { x: ox - 0.12, startY: oy - 0.28, height: 0.18 }
        ];
        for (var wi = 0; wi < wallPositions.length; wi++) {
            var wGeo = new THREE.BoxGeometry(0.04, 0.01, 0.06);
            var wMat = new THREE.MeshBasicMaterial({
                color: 0xaa9988, transparent: true, opacity: 0
            });
            var wall = new THREE.Mesh(wGeo, wMat);
            wall.position.set(wallPositions[wi].x, wallPositions[wi].startY, 0.01);
            wall.visible = false;
            scene.add(wall);
            this._walls.push({
                mesh: wall,
                startY: wallPositions[wi].startY,
                height: wallPositions[wi].height,
                x: wallPositions[wi].x
            });
        }

        // Roof triangle (two angled boxes)
        this._roofParts = [];
        for (var ri = 0; ri < 2; ri++) {
            var rGeo = new THREE.BoxGeometry(0.18, 0.02, 0.06);
            var rMat = new THREE.MeshBasicMaterial({
                color: 0xcc4422, transparent: true, opacity: 0
            });
            var roof = new THREE.Mesh(rGeo, rMat);
            roof.visible = false;
            scene.add(roof);
            this._roofParts.push(roof);
        }

        // Windows (4 small squares)
        this._windows = [];
        var winPositions = [
            { x: ox - 0.22, y: oy - 0.12 },
            { x: ox - 0.22, y: oy - 0.20 },
            { x: ox - 0.02, y: oy - 0.12 },
            { x: ox - 0.02, y: oy - 0.20 }
        ];
        for (var wni = 0; wni < winPositions.length; wni++) {
            var wnGeo = new THREE.BoxGeometry(0.035, 0.035, 0.01);
            var wnMat = new THREE.MeshBasicMaterial({
                color: 0x88ccff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var win = new THREE.Mesh(wnGeo, wnMat);
            win.position.set(winPositions[wni].x, winPositions[wni].y, 0.04);
            win.visible = false;
            scene.add(win);
            this._windows.push(win);
        }

        // Structural beam lines
        this._beams = [];
        var beamColor = new THREE.LineBasicMaterial({
            color: 0x888888, transparent: true, opacity: 0
        });
        var beamDefs = [
            [ox - 0.26, oy - 0.28, ox - 0.26, oy - 0.03],
            [ox + 0.02, oy - 0.28, ox + 0.02, oy - 0.03],
            [ox - 0.26, oy - 0.03, ox - 0.12, oy + 0.08],
            [ox + 0.02, oy - 0.03, ox - 0.12, oy + 0.08]
        ];
        for (var bi = 0; bi < beamDefs.length; bi++) {
            var bPts = [];
            bPts.push(new THREE.Vector3(beamDefs[bi][0], beamDefs[bi][1], 0.02));
            bPts.push(new THREE.Vector3(beamDefs[bi][2], beamDefs[bi][3], 0.02));
            var bGeo = new THREE.BufferGeometry().setFromPoints(bPts);
            var beam = new THREE.Line(bGeo, beamColor.clone());
            beam.visible = false;
            scene.add(beam);
            this._beams.push(beam);
        }

        // Golden completion glow
        var glowGeo = new THREE.SphereGeometry(0.35, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xffcc44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glow = new THREE.Mesh(glowGeo, glowMat);
        this._glow.position.set(ox - 0.12, oy - 0.12, -0.05);
        scene.add(this._glow);

        // Construction dust particles
        this._dust = [];
        var dustGeo = new THREE.SphereGeometry(0.01, 4, 4);
        for (var di = 0; di < 20; di++) {
            var dMat = new THREE.MeshBasicMaterial({
                color: di % 2 === 0 ? 0xddccaa : 0xbbaa88,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var dust = new THREE.Mesh(dustGeo, dMat);
            dust.visible = false;
            scene.add(dust);
            this._dust.push({
                mesh: dust, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0
            });
        }
        this._dustIdx = 0;
    },
    _emitDust(x, y) {
        var d = this._dust[this._dustIdx % this._dust.length];
        this._dustIdx++;
        d.mesh.visible = true;
        d.mesh.position.set(x + (Math.random() - 0.5) * 0.05, y, 0.03);
        var a = Math.random() * Math.PI;
        d.vx = Math.cos(a) * (0.2 + Math.random() * 0.3);
        d.vy = Math.sin(a) * (0.2 + Math.random() * 0.3);
        d.vz = (Math.random() - 0.5) * 0.1;
        d.life = 0.4 + Math.random() * 0.3;
        d.maxLife = d.life;
        d.mesh.material.opacity = 0.6;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        if (progress < 0.10) {
            // Phase 1: Blueprint grid appears
            var t = progress / 0.10;
            var ease = t * t;
            for (var gi = 0; gi < this._gridLines.length; gi++) {
                this._gridLines[gi].visible = true;
                this._gridLines[gi].material.opacity = ease * 0.3;
            }
            model.position.set(ox + 0.2, oy, oz);
        } else if (progress < 0.22) {
            // Phase 2: Foundation blocks placed
            var t2 = (progress - 0.10) / 0.12;
            for (var fi = 0; fi < this._foundations.length; fi++) {
                var fDelay = fi * 0.25;
                var fT = Math.max(0, Math.min(1, (t2 - fDelay) / 0.4));
                this._foundations[fi].visible = fT > 0;
                this._foundations[fi].material.opacity = fT * 0.7;
                this._foundations[fi].position.y = oy - 0.3 + (1 - fT) * 0.1;
                if (fT > 0 && fT < 0.5 && Math.random() < 0.1) {
                    this._emitDust(this._foundations[fi].position.x, oy - 0.3);
                }
            }
            model.position.set(ox + 0.2, oy + Math.sin(time * 2) * 0.005, oz);
        } else if (progress < 0.42) {
            // Phase 3: Walls rise
            var t3 = (progress - 0.22) / 0.20;
            for (var fi2 = 0; fi2 < this._foundations.length; fi2++) {
                this._foundations[fi2].material.opacity = 0.7;
            }
            for (var wi = 0; wi < this._walls.length; wi++) {
                var wDelay = wi * 0.2;
                var wT = Math.max(0, Math.min(1, (t3 - wDelay) / 0.5));
                this._walls[wi].mesh.visible = wT > 0;
                var currentH = this._walls[wi].height * wT;
                this._walls[wi].mesh.scale.set(1, currentH / 0.01, 1);
                this._walls[wi].mesh.position.y = this._walls[wi].startY + currentH * 0.5;
                this._walls[wi].mesh.material.opacity = wT * 0.6;
                if (wT > 0.1 && wT < 0.9 && Math.random() < 0.05) {
                    this._emitDust(this._walls[wi].x, this._walls[wi].startY + currentH);
                }
            }
            // Grid fades slightly
            for (var g2 = 0; g2 < this._gridLines.length; g2++) {
                this._gridLines[g2].material.opacity = 0.3 - t3 * 0.1;
            }
            model.position.set(ox + 0.2, oy + Math.sin(time * 1.5) * 0.008, oz);
            model.rotation.z = Math.sin(time * 1) * 0.02;
        } else if (progress < 0.55) {
            // Phase 4: Roof goes on
            var t4 = (progress - 0.42) / 0.13;
            var ease4 = t4 * t4 * (3 - 2 * t4);
            // Left roof panel
            this._roofParts[0].visible = true;
            this._roofParts[0].material.opacity = ease4 * 0.7;
            this._roofParts[0].position.set(ox - 0.21, oy - 0.03 + ease4 * 0.02, 0.01);
            this._roofParts[0].rotation.z = 0.35;
            // Right roof panel
            this._roofParts[1].visible = true;
            this._roofParts[1].material.opacity = ease4 * 0.7;
            this._roofParts[1].position.set(ox - 0.03, oy - 0.03 + ease4 * 0.02, 0.01);
            this._roofParts[1].rotation.z = -0.35;

            if (t4 < 0.5 && Math.random() < 0.08) {
                this._emitDust(ox - 0.12, oy - 0.01);
            }

            model.position.set(ox + 0.2, oy, oz);
        } else if (progress < 0.65) {
            // Phase 5: Windows appear
            var t5 = (progress - 0.55) / 0.10;
            for (var wni = 0; wni < this._windows.length; wni++) {
                var wnDelay = wni * 0.2;
                var wnT = Math.max(0, Math.min(1, (t5 - wnDelay) / 0.4));
                this._windows[wni].visible = wnT > 0;
                this._windows[wni].material.opacity = wnT * 0.6;
                this._windows[wni].scale.setScalar(wnT);
            }
            model.position.set(ox + 0.2, oy, oz);
        } else if (progress < 0.78) {
            // Phase 6: Structural beam lines connect + shimmer
            var t6 = (progress - 0.65) / 0.13;
            for (var bmi = 0; bmi < this._beams.length; bmi++) {
                var bmDelay = bmi * 0.15;
                var bmT = Math.max(0, Math.min(1, (t6 - bmDelay) / 0.4));
                this._beams[bmi].visible = bmT > 0;
                this._beams[bmi].material.opacity = bmT * 0.5;
            }
            // Windows glow
            for (var wn2 = 0; wn2 < this._windows.length; wn2++) {
                this._windows[wn2].material.opacity = 0.6 + Math.sin(time * 3 + wn2) * 0.2;
            }
            model.position.set(ox + 0.2, oy, oz);
        } else if (progress < 0.90) {
            // Phase 7: Building complete - golden glow
            var t7 = (progress - 0.78) / 0.12;
            var pulse = Math.sin(t7 * Math.PI * 3);
            this._glow.material.opacity = t7 * 0.2 + pulse * 0.05;
            this._glow.scale.setScalar(1 + t7 * 0.5 + pulse * 0.1);

            // All windows warm up
            for (var wn3 = 0; wn3 < this._windows.length; wn3++) {
                this._windows[wn3].material.color.setRGB(
                    0.5 + t7 * 0.5,
                    0.8 + t7 * 0.2,
                    1.0 - t7 * 0.2
                );
                this._windows[wn3].material.opacity = 0.7 + Math.sin(time * 4 + wn3) * 0.15;
            }
            model.position.set(ox + 0.2, oy, oz);
        } else {
            // Phase 8: Fade out
            var t8 = (progress - 0.90) / 0.10;
            var fadeOut = 1 - t8;
            for (var g3 = 0; g3 < this._gridLines.length; g3++) {
                this._gridLines[g3].material.opacity *= fadeOut;
            }
            for (var fi3 = 0; fi3 < this._foundations.length; fi3++) {
                this._foundations[fi3].material.opacity = 0.7 * fadeOut;
            }
            for (var wi2 = 0; wi2 < this._walls.length; wi2++) {
                this._walls[wi2].mesh.material.opacity *= fadeOut;
            }
            for (var ri = 0; ri < this._roofParts.length; ri++) {
                this._roofParts[ri].material.opacity *= fadeOut;
            }
            for (var wn4 = 0; wn4 < this._windows.length; wn4++) {
                this._windows[wn4].material.opacity *= fadeOut;
            }
            for (var bm2 = 0; bm2 < this._beams.length; bm2++) {
                this._beams[bm2].material.opacity *= fadeOut;
            }
            this._glow.material.opacity *= fadeOut;
            model.position.set(ox + 0.2 * fadeOut, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update dust particles
        for (var di = 0; di < this._dust.length; di++) {
            var d = this._dust[di];
            if (d.life <= 0) continue;
            d.life -= delta;
            if (d.life <= 0) { d.mesh.visible = false; continue; }
            d.mesh.position.x += d.vx * delta;
            d.mesh.position.y += d.vy * delta;
            d.mesh.position.z += d.vz * delta;
            d.vy -= 1.5 * delta;
            var lr = d.life / d.maxLife;
            d.mesh.material.opacity = lr * 0.5;
            d.mesh.scale.setScalar(0.5 + (1 - lr) * 0.5);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._gridLines) {
            this._gridLines.forEach(function(l) {
                scene.remove(l); l.geometry.dispose(); l.material.dispose();
            });
        }
        if (this._foundations) {
            this._foundations.forEach(function(f) {
                scene.remove(f); f.geometry.dispose(); f.material.dispose();
            });
        }
        if (this._walls) {
            this._walls.forEach(function(w) {
                scene.remove(w.mesh); w.mesh.geometry.dispose(); w.mesh.material.dispose();
            });
        }
        if (this._roofParts) {
            this._roofParts.forEach(function(r) {
                scene.remove(r); r.geometry.dispose(); r.material.dispose();
            });
        }
        if (this._windows) {
            this._windows.forEach(function(w) {
                scene.remove(w); w.geometry.dispose(); w.material.dispose();
            });
        }
        if (this._beams) {
            this._beams.forEach(function(b) {
                scene.remove(b); b.geometry.dispose(); b.material.dispose();
            });
        }
        if (this._glow) { scene.remove(this._glow); this._glow.geometry.dispose(); this._glow.material.dispose(); }
        if (this._dust) {
            this._dust.forEach(function(d) {
                scene.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose();
            });
        }
        this._gridLines = this._foundations = this._walls = this._roofParts = null;
        this._windows = this._beams = this._glow = this._dust = null;
    }
};
