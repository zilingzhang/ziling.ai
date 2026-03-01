export default {
    name: 'Sketching',
    label: 'sketching',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Gestural lines (thin box segments appearing rapidly)
        this._strokes = [];
        var strokeGeo = new THREE.BoxGeometry(0.06, 0.003, 0.002);
        for (var i = 0; i < 40; i++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: i % 5 === 0 ? 0x333333 : (i % 5 === 1 ? 0x444444 : (i % 5 === 2 ? 0x555555 : (i % 5 === 3 ? 0x666666 : 0x777777))),
                transparent: true, opacity: 0
            });
            var stroke = new THREE.Mesh(strokeGeo, sMat);
            stroke.visible = false;
            scene.add(stroke);
            this._strokes.push({
                mesh: stroke,
                placed: false,
                x: 0, y: 0,
                angle: 0,
                scaleX: 0.5 + Math.random() * 1.0
            });
        }
        this._strokeIdx = 0;
        this._lastStroke = 0;

        // Cross-hatching patterns (grid of angled strokes)
        this._crossHatch = [];
        var hatchGeo = new THREE.BoxGeometry(0.04, 0.002, 0.001);
        for (var hi = 0; hi < 30; hi++) {
            var hMat = new THREE.MeshBasicMaterial({
                color: hi % 2 === 0 ? 0x444444 : 0x555555,
                transparent: true, opacity: 0
            });
            var hatch = new THREE.Mesh(hatchGeo, hMat);
            hatch.visible = false;
            scene.add(hatch);
            this._crossHatch.push({
                mesh: hatch, placed: false
            });
        }
        this._hatchIdx = 0;

        // Shadow/light area particles (varying opacity)
        this._shadingParticles = [];
        var shadGeo = new THREE.SphereGeometry(0.01, 4, 4);
        for (var si = 0; si < 20; si++) {
            var spMat = new THREE.MeshBasicMaterial({
                color: si < 10 ? 0x333333 : 0xaaaaaa,
                transparent: true, opacity: 0
            });
            var sp = new THREE.Mesh(shadGeo, spMat);
            sp.visible = false;
            scene.add(sp);
            this._shadingParticles.push({
                mesh: sp, placed: false
            });
        }

        // Accent color strokes (a pop of color)
        this._accentStrokes = [];
        var accentGeo = new THREE.BoxGeometry(0.05, 0.004, 0.002);
        var accentColor = 0xcc4422;
        for (var ai = 0; ai < 6; ai++) {
            var aMat = new THREE.MeshBasicMaterial({
                color: accentColor, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var accent = new THREE.Mesh(accentGeo, aMat);
            accent.visible = false;
            scene.add(accent);
            this._accentStrokes.push({
                mesh: accent, placed: false
            });
        }

        // Artistic energy particles (pencil graphite dust)
        this._graphiteDust = [];
        var dustGeo = new THREE.SphereGeometry(0.005, 3, 3);
        for (var di = 0; di < 20; di++) {
            var dMat = new THREE.MeshBasicMaterial({
                color: di % 3 === 0 ? 0x555555 : (di % 3 === 1 ? 0x888888 : 0x333333),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var dust = new THREE.Mesh(dustGeo, dMat);
            dust.visible = false;
            scene.add(dust);
            this._graphiteDust.push({
                mesh: dust, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._dustIdx = 0;

        // Sketch area frame
        var framePts = [
            new THREE.Vector3(ox - 0.35, oy - 0.25, -0.01),
            new THREE.Vector3(ox + 0.15, oy - 0.25, -0.01),
            new THREE.Vector3(ox + 0.15, oy + 0.2, -0.01),
            new THREE.Vector3(ox - 0.35, oy + 0.2, -0.01),
            new THREE.Vector3(ox - 0.35, oy - 0.25, -0.01)
        ];
        var frameGeo = new THREE.BufferGeometry().setFromPoints(framePts);
        var frameMat = new THREE.LineBasicMaterial({
            color: 0x999999, transparent: true, opacity: 0
        });
        this._frame = new THREE.Line(frameGeo, frameMat);
        scene.add(this._frame);

        this._sketchPhase = 0;
    },
    _emitDust(x, y) {
        var d = this._graphiteDust[this._dustIdx % this._graphiteDust.length];
        this._dustIdx++;
        d.mesh.visible = true;
        d.mesh.position.set(x, y, 0.02);
        var a = Math.random() * Math.PI * 2;
        d.vx = Math.cos(a) * (0.1 + Math.random() * 0.3);
        d.vy = Math.sin(a) * (0.1 + Math.random() * 0.3);
        d.life = 0.3 + Math.random() * 0.3;
        d.maxLife = d.life;
        d.mesh.material.opacity = 0.4;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        var sketchCx = ox - 0.1;
        var sketchCy = oy - 0.025;

        if (progress < 0.08) {
            // Phase 1: Frame appears
            var t = progress / 0.08;
            this._frame.material.opacity = t * 0.3;
            model.position.set(ox + 0.2, oy, oz);
        } else if (progress < 0.35) {
            // Phase 2: Quick gestural lines appear rapidly
            var t2 = (progress - 0.08) / 0.27;
            this._frame.material.opacity = 0.3;

            // Place strokes rapidly
            var targetStrokes = Math.floor(t2 * 25);
            while (this._strokeIdx < targetStrokes && this._strokeIdx < this._strokes.length) {
                var s = this._strokes[this._strokeIdx];
                s.placed = true;
                s.mesh.visible = true;
                s.x = sketchCx + (Math.random() - 0.5) * 0.4;
                s.y = sketchCy + (Math.random() - 0.5) * 0.35;
                s.angle = (Math.random() - 0.5) * Math.PI * 0.5;
                s.mesh.position.set(s.x, s.y, 0.005);
                s.mesh.rotation.z = s.angle;
                s.mesh.scale.x = s.scaleX;
                s.mesh.material.opacity = 0;
                this._emitDust(s.x, s.y);
                this._strokeIdx++;
            }

            // Fade in placed strokes
            for (var si = 0; si < this._strokeIdx; si++) {
                var st = this._strokes[si];
                if (st.mesh.material.opacity < 0.5) {
                    st.mesh.material.opacity = Math.min(0.5, st.mesh.material.opacity + delta * 3);
                }
            }

            model.position.set(ox + 0.2, oy + Math.sin(time * 3) * 0.005, oz);
            model.rotation.z = Math.sin(time * 2) * 0.03;
        } else if (progress < 0.55) {
            // Phase 3: Cross-hatching patterns form
            var t3 = (progress - 0.35) / 0.20;
            var targetHatch = Math.floor(t3 * this._crossHatch.length);

            for (var hi = 0; hi < targetHatch && hi < this._crossHatch.length; hi++) {
                var h = this._crossHatch[hi];
                if (!h.placed) {
                    h.placed = true;
                    h.mesh.visible = true;
                    // Organized cross-hatch in the shadow area
                    var row = Math.floor(hi / 6);
                    var col = hi % 6;
                    h.mesh.position.set(
                        sketchCx - 0.1 + col * 0.025,
                        sketchCy - 0.08 + row * 0.025,
                        0.008
                    );
                    h.mesh.rotation.z = row % 2 === 0 ? 0.5 : -0.5;
                    this._emitDust(h.mesh.position.x, h.mesh.position.y);
                }
                h.mesh.material.opacity = Math.min(0.35, h.mesh.material.opacity + delta * 2);
            }

            // Place shading particles
            var targetShading = Math.floor(t3 * this._shadingParticles.length);
            for (var spi = 0; spi < targetShading && spi < this._shadingParticles.length; spi++) {
                var shp = this._shadingParticles[spi];
                if (!shp.placed) {
                    shp.placed = true;
                    shp.mesh.visible = true;
                    shp.mesh.position.set(
                        sketchCx + (Math.random() - 0.5) * 0.35,
                        sketchCy + (Math.random() - 0.5) * 0.3,
                        0.003
                    );
                }
                shp.mesh.material.opacity = Math.min(spi < 10 ? 0.3 : 0.15, shp.mesh.material.opacity + delta * 1.5);
            }

            model.position.set(ox + 0.2, oy + Math.sin(time * 2.5) * 0.004, oz);
            model.rotation.z = Math.sin(time * 1.8) * 0.02;
        } else if (progress < 0.72) {
            // Phase 4: Accent color strokes
            var t4 = (progress - 0.55) / 0.17;
            var targetAccent = Math.floor(t4 * this._accentStrokes.length);

            for (var ai = 0; ai < targetAccent && ai < this._accentStrokes.length; ai++) {
                var ac = this._accentStrokes[ai];
                if (!ac.placed) {
                    ac.placed = true;
                    ac.mesh.visible = true;
                    ac.mesh.position.set(
                        sketchCx + (Math.random() - 0.5) * 0.25,
                        sketchCy + (Math.random() - 0.5) * 0.2,
                        0.01
                    );
                    ac.mesh.rotation.z = (Math.random() - 0.5) * Math.PI * 0.4;
                    this._emitDust(ac.mesh.position.x, ac.mesh.position.y);
                    this._emitDust(ac.mesh.position.x, ac.mesh.position.y);
                }
                ac.mesh.material.opacity = Math.min(0.6, ac.mesh.material.opacity + delta * 2);
            }

            // More gestural strokes
            if (this._strokeIdx < this._strokes.length && time - this._lastStroke > 0.08) {
                var s2 = this._strokes[this._strokeIdx];
                s2.placed = true;
                s2.mesh.visible = true;
                s2.x = sketchCx + (Math.random() - 0.5) * 0.35;
                s2.y = sketchCy + (Math.random() - 0.5) * 0.3;
                s2.mesh.position.set(s2.x, s2.y, 0.005);
                s2.mesh.rotation.z = (Math.random() - 0.5) * Math.PI * 0.3;
                s2.mesh.scale.x = s2.scaleX;
                s2.mesh.material.opacity = 0.4;
                this._emitDust(s2.x, s2.y);
                this._strokeIdx++;
                this._lastStroke = time;
            }

            model.position.set(ox + 0.2, oy + Math.sin(time * 2) * 0.003, oz);
        } else if (progress < 0.88) {
            // Phase 5: Artistic energy, everything hums
            var t5 = (progress - 0.72) / 0.16;
            var artPulse = Math.sin(t5 * Math.PI * 3);

            // Strokes pulse slightly
            for (var si2 = 0; si2 < this._strokes.length; si2++) {
                if (this._strokes[si2].placed) {
                    this._strokes[si2].mesh.material.opacity = 0.4 + artPulse * 0.05;
                }
            }

            // Accent strokes glow
            for (var ai2 = 0; ai2 < this._accentStrokes.length; ai2++) {
                if (this._accentStrokes[ai2].placed) {
                    this._accentStrokes[ai2].mesh.material.opacity = 0.6 + artPulse * 0.15;
                }
            }

            // Graphite dust
            if (Math.random() < 0.05) {
                this._emitDust(
                    sketchCx + (Math.random() - 0.5) * 0.3,
                    sketchCy + (Math.random() - 0.5) * 0.25
                );
            }

            model.position.set(ox + 0.2, oy, oz);
        } else {
            // Phase 6: Fade out
            var t6 = (progress - 0.88) / 0.12;
            var fadeOut = 1 - t6;
            this._frame.material.opacity = 0.3 * fadeOut;
            for (var si3 = 0; si3 < this._strokes.length; si3++) {
                if (this._strokes[si3].placed) {
                    this._strokes[si3].mesh.material.opacity *= fadeOut;
                }
            }
            for (var hi2 = 0; hi2 < this._crossHatch.length; hi2++) {
                if (this._crossHatch[hi2].placed) {
                    this._crossHatch[hi2].mesh.material.opacity *= fadeOut;
                }
            }
            for (var spi2 = 0; spi2 < this._shadingParticles.length; spi2++) {
                if (this._shadingParticles[spi2].placed) {
                    this._shadingParticles[spi2].mesh.material.opacity *= fadeOut;
                }
            }
            for (var ai3 = 0; ai3 < this._accentStrokes.length; ai3++) {
                if (this._accentStrokes[ai3].placed) {
                    this._accentStrokes[ai3].mesh.material.opacity *= fadeOut;
                }
            }
            model.position.set(ox + 0.2 * fadeOut, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update graphite dust
        for (var di = 0; di < this._graphiteDust.length; di++) {
            var gd = this._graphiteDust[di];
            if (gd.life <= 0) continue;
            gd.life -= delta;
            if (gd.life <= 0) { gd.mesh.visible = false; continue; }
            gd.mesh.position.x += gd.vx * delta;
            gd.mesh.position.y += gd.vy * delta;
            var lr = gd.life / gd.maxLife;
            gd.mesh.material.opacity = lr * 0.3;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._strokes) {
            this._strokes.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
        }
        if (this._crossHatch) {
            this._crossHatch.forEach(function(h) { scene.remove(h.mesh); h.mesh.geometry.dispose(); h.mesh.material.dispose(); });
        }
        if (this._shadingParticles) {
            this._shadingParticles.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
        }
        if (this._accentStrokes) {
            this._accentStrokes.forEach(function(a) { scene.remove(a.mesh); a.mesh.geometry.dispose(); a.mesh.material.dispose(); });
        }
        if (this._graphiteDust) {
            this._graphiteDust.forEach(function(d) { scene.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose(); });
        }
        if (this._frame) { scene.remove(this._frame); this._frame.geometry.dispose(); this._frame.material.dispose(); }
        this._strokes = this._crossHatch = this._shadingParticles = this._accentStrokes = this._graphiteDust = this._frame = null;
    }
};
