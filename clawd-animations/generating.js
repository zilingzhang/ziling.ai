export default {
    name: 'Generating',
    label: 'generating',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Central spinning torus (dynamo core)
        var coreGeo = new THREE.TorusGeometry(0.08, 0.025, 10, 24);
        var coreMat = new THREE.MeshBasicMaterial({
            color: 0x44aaff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._core = new THREE.Mesh(coreGeo, coreMat);
        this._core.position.set(ox - 0.15, oy, 0.02);
        scene.add(this._core);

        // Inner core sphere
        var innerGeo = new THREE.SphereGeometry(0.04, 10, 10);
        var innerMat = new THREE.MeshBasicMaterial({
            color: 0x88ddff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._inner = new THREE.Mesh(innerGeo, innerMat);
        this._inner.position.set(ox - 0.15, oy, 0.03);
        scene.add(this._inner);

        // Magnetic field lines (curved line geometries radiating)
        this._fieldLines = [];
        for (var fi = 0; fi < 8; fi++) {
            var pts = [];
            var baseAngle = (fi / 8) * Math.PI * 2;
            var segments = 15;
            for (var s = 0; s < segments; s++) {
                var t = s / (segments - 1);
                var r = 0.1 + t * 0.2;
                var a = baseAngle + t * Math.PI * 0.4;
                pts.push(new THREE.Vector3(
                    ox - 0.15 + Math.cos(a) * r,
                    oy + Math.sin(a) * r * 0.8,
                    0.01
                ));
            }
            var fGeo = new THREE.BufferGeometry().setFromPoints(pts);
            var fMat = new THREE.LineBasicMaterial({
                color: fi % 2 === 0 ? 0x44aaff : 0x8844ff,
                transparent: true, opacity: 0
            });
            var fLine = new THREE.Line(fGeo, fMat);
            fLine.visible = false;
            scene.add(fLine);
            this._fieldLines.push({
                line: fLine,
                baseAngle: baseAngle,
                phase: fi * 0.5
            });
        }

        // Energy particles flowing along field lines
        this._energyParticles = [];
        var epGeo = new THREE.SphereGeometry(0.008, 4, 4);
        for (var ei = 0; ei < 30; ei++) {
            var eMat = new THREE.MeshBasicMaterial({
                color: ei % 3 === 0 ? 0x44ccff : (ei % 3 === 1 ? 0xffcc44 : 0xff44cc),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ep = new THREE.Mesh(epGeo, eMat);
            ep.visible = false;
            scene.add(ep);
            this._energyParticles.push({
                mesh: ep, life: 0, maxLife: 0,
                fieldIdx: 0, t: 0, speed: 0
            });
        }
        this._epIdx = 0;
        this._lastEP = 0;

        // Output beam (line of particles going right)
        this._beamParticles = [];
        var bpGeo = new THREE.SphereGeometry(0.012, 5, 5);
        for (var bi = 0; bi < 15; bi++) {
            var bMat = new THREE.MeshBasicMaterial({
                color: 0xffcc22, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var bp = new THREE.Mesh(bpGeo, bMat);
            bp.visible = false;
            scene.add(bp);
            this._beamParticles.push({
                mesh: bp, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._bpIdx = 0;
        this._lastBP = 0;

        // Power meter (thin box that fills)
        var meterBgGeo = new THREE.BoxGeometry(0.15, 0.02, 0.01);
        var meterBgMat = new THREE.MeshBasicMaterial({
            color: 0x333344, transparent: true, opacity: 0
        });
        this._meterBg = new THREE.Mesh(meterBgGeo, meterBgMat);
        this._meterBg.position.set(ox - 0.15, oy - 0.2, 0.01);
        scene.add(this._meterBg);

        var meterFillGeo = new THREE.BoxGeometry(0.01, 0.018, 0.012);
        var meterFillMat = new THREE.MeshBasicMaterial({
            color: 0x44ff88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._meterFill = new THREE.Mesh(meterFillGeo, meterFillMat);
        this._meterFill.position.set(ox - 0.22, oy - 0.2, 0.02);
        scene.add(this._meterFill);

        // Electric glow
        var glowGeo = new THREE.SphereGeometry(0.3, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0x4488ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glow = new THREE.Mesh(glowGeo, glowMat);
        this._glow.position.set(ox - 0.15, oy, -0.05);
        scene.add(this._glow);

        this._coreAngle = 0;
        this._powerLevel = 0;
    },
    _emitFieldParticle(fieldIdx, ox, oy) {
        var ep = this._energyParticles[this._epIdx % this._energyParticles.length];
        this._epIdx++;
        ep.mesh.visible = true;
        ep.fieldIdx = fieldIdx;
        ep.t = 0;
        ep.speed = 0.8 + Math.random() * 0.5;
        var fl = this._fieldLines[fieldIdx];
        ep.mesh.position.set(ox - 0.15, oy, 0.03);
        ep.life = 0.5 + Math.random() * 0.3;
        ep.maxLife = ep.life;
        ep.mesh.material.opacity = 0.7;
    },
    _emitBeamParticle(ox, oy) {
        var bp = this._beamParticles[this._bpIdx % this._beamParticles.length];
        this._bpIdx++;
        bp.mesh.visible = true;
        bp.mesh.position.set(ox - 0.05, oy + (Math.random() - 0.5) * 0.03, 0.02);
        bp.vx = 1.5 + Math.random() * 1.0;
        bp.vy = (Math.random() - 0.5) * 0.2;
        bp.life = 0.3 + Math.random() * 0.2;
        bp.maxLife = bp.life;
        bp.mesh.material.opacity = 0.8;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        // Core rotation always
        this._coreAngle += delta * (3 + progress * 8);
        this._core.rotation.x = this._coreAngle * 0.7;
        this._core.rotation.y = this._coreAngle;

        if (progress < 0.10) {
            // Phase 1: Core appears
            var t = progress / 0.10;
            this._core.material.opacity = t * 0.6;
            this._inner.material.opacity = t * 0.5;
            this._core.scale.setScalar(0.5 + t * 0.5);
            this._inner.scale.setScalar(t);
            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.30) {
            // Phase 2: Field lines appear, energy particles start
            var t2 = (progress - 0.10) / 0.20;
            this._core.material.opacity = 0.6 + Math.sin(time * 4) * 0.15;
            this._inner.material.opacity = 0.5 + Math.sin(time * 5) * 0.1;

            for (var fi = 0; fi < this._fieldLines.length; fi++) {
                var fDelay = fi * 0.08;
                var fT = Math.max(0, Math.min(1, (t2 - fDelay) / 0.3));
                this._fieldLines[fi].line.visible = fT > 0;
                this._fieldLines[fi].line.material.opacity = fT * 0.4;
            }

            // Start energy particles
            if (time - this._lastEP > 0.1 && t2 > 0.3) {
                this._emitFieldParticle(Math.floor(Math.random() * 8), ox, oy);
                this._lastEP = time;
            }

            model.position.set(ox + 0.15, oy + Math.sin(time * 2) * 0.005, oz);
        } else if (progress < 0.55) {
            // Phase 3: Energy flows along field lines intensely
            var t3 = (progress - 0.30) / 0.25;

            for (var fi2 = 0; fi2 < this._fieldLines.length; fi2++) {
                this._fieldLines[fi2].line.material.opacity = 0.4 + Math.sin(time * 3 + fi2) * 0.15;
            }

            // Faster energy particles
            if (time - this._lastEP > 0.05) {
                this._emitFieldParticle(Math.floor(Math.random() * 8), ox, oy);
                this._lastEP = time;
            }

            // Power meter starts filling
            this._powerLevel = t3;
            this._meterBg.material.opacity = 0.4;
            this._meterFill.material.opacity = 0.6;
            this._meterFill.scale.x = Math.max(0.1, this._powerLevel * 14);
            this._meterFill.position.x = ox - 0.22 + this._powerLevel * 0.07;

            this._glow.material.opacity = t3 * 0.08;
            model.position.set(ox + 0.15, oy + Math.sin(time * 2.5) * 0.008, oz);
        } else if (progress < 0.75) {
            // Phase 4: Output beam channels energy outward
            var t4 = (progress - 0.55) / 0.20;

            // Full field activity
            for (var fi3 = 0; fi3 < this._fieldLines.length; fi3++) {
                this._fieldLines[fi3].line.material.opacity = 0.5 + Math.sin(time * 4 + fi3 * 0.7) * 0.2;
            }

            // Energy particles
            if (time - this._lastEP > 0.04) {
                this._emitFieldParticle(Math.floor(Math.random() * 8), ox, oy);
                this._lastEP = time;
            }

            // Output beam
            if (time - this._lastBP > 0.06) {
                this._emitBeamParticle(ox, oy);
                this._lastBP = time;
            }

            // Power meter full, pulsing
            this._powerLevel = 1.0;
            this._meterFill.scale.x = 14;
            this._meterFill.position.x = ox - 0.15;
            this._meterFill.material.opacity = 0.6 + Math.sin(time * 5) * 0.2;
            this._meterFill.material.color.setRGB(0.3 + Math.sin(time * 3) * 0.3, 1, 0.5);

            this._glow.material.opacity = 0.08 + t4 * 0.08;
            this._glow.scale.setScalar(1 + t4 * 0.3);

            // Core pulses faster
            this._core.material.opacity = 0.6 + Math.sin(time * 6) * 0.2;
            this._inner.material.opacity = 0.5 + Math.sin(time * 7) * 0.15;

            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.90) {
            // Phase 5: Peak power, electric discharge
            var t5 = (progress - 0.75) / 0.15;
            var discharge = Math.sin(t5 * Math.PI * 4);

            this._core.material.opacity = 0.8 + discharge * 0.2;
            this._inner.material.opacity = 0.7 + discharge * 0.2;
            this._inner.material.color.setRGB(0.8 + discharge * 0.2, 1, 1);

            // Rapid beam output
            if (time - this._lastBP > 0.03) {
                this._emitBeamParticle(ox, oy);
                this._lastBP = time;
            }

            this._glow.material.opacity = 0.16 + discharge * 0.08;

            model.position.set(ox + 0.15, oy, oz);
        } else {
            // Phase 6: Fade out
            var t6 = (progress - 0.90) / 0.10;
            var fadeOut = 1 - t6;
            this._core.material.opacity = 0.8 * fadeOut;
            this._inner.material.opacity = 0.7 * fadeOut;
            for (var fi4 = 0; fi4 < this._fieldLines.length; fi4++) {
                this._fieldLines[fi4].line.material.opacity *= fadeOut;
            }
            this._meterBg.material.opacity = 0.4 * fadeOut;
            this._meterFill.material.opacity *= fadeOut;
            this._glow.material.opacity *= fadeOut;
            model.position.set(ox + 0.15 * fadeOut, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update energy particles (orbit along field lines)
        for (var ei = 0; ei < this._energyParticles.length; ei++) {
            var ep = this._energyParticles[ei];
            if (ep.life <= 0) continue;
            ep.life -= delta;
            if (ep.life <= 0) { ep.mesh.visible = false; continue; }
            ep.t += delta * ep.speed;
            var fl = this._fieldLines[ep.fieldIdx];
            var r = 0.1 + Math.min(1, ep.t) * 0.2;
            var a = fl.baseAngle + Math.min(1, ep.t) * Math.PI * 0.4;
            ep.mesh.position.set(
                ox - 0.15 + Math.cos(a) * r,
                oy + Math.sin(a) * r * 0.8,
                0.03
            );
            var lr = ep.life / ep.maxLife;
            ep.mesh.material.opacity = lr * 0.6;
            ep.mesh.scale.setScalar(0.5 + (1 - lr) * 0.5);
        }

        // Update beam particles
        for (var bi = 0; bi < this._beamParticles.length; bi++) {
            var bp = this._beamParticles[bi];
            if (bp.life <= 0) continue;
            bp.life -= delta;
            if (bp.life <= 0) { bp.mesh.visible = false; continue; }
            bp.mesh.position.x += bp.vx * delta;
            bp.mesh.position.y += bp.vy * delta;
            var blr = bp.life / bp.maxLife;
            bp.mesh.material.opacity = blr * 0.7;
            bp.mesh.scale.setScalar(0.8 + (1 - blr) * 0.5);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._core) { scene.remove(this._core); this._core.geometry.dispose(); this._core.material.dispose(); }
        if (this._inner) { scene.remove(this._inner); this._inner.geometry.dispose(); this._inner.material.dispose(); }
        if (this._fieldLines) {
            this._fieldLines.forEach(function(f) { scene.remove(f.line); f.line.geometry.dispose(); f.line.material.dispose(); });
        }
        if (this._energyParticles) {
            this._energyParticles.forEach(function(e) { scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose(); });
        }
        if (this._beamParticles) {
            this._beamParticles.forEach(function(b) { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); });
        }
        if (this._meterBg) { scene.remove(this._meterBg); this._meterBg.geometry.dispose(); this._meterBg.material.dispose(); }
        if (this._meterFill) { scene.remove(this._meterFill); this._meterFill.geometry.dispose(); this._meterFill.material.dispose(); }
        if (this._glow) { scene.remove(this._glow); this._glow.geometry.dispose(); this._glow.material.dispose(); }
        this._core = this._inner = this._fieldLines = this._energyParticles = null;
        this._beamParticles = this._meterBg = this._meterFill = this._glow = null;
    }
};
