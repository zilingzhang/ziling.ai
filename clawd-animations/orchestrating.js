export default {
    name: 'Orchestrating',
    label: 'orchestrating',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Conductor baton line
        var batonPts = [];
        batonPts.push(new THREE.Vector3(0, 0, 0));
        batonPts.push(new THREE.Vector3(0.12, 0.06, 0));
        var batonGeo = new THREE.BufferGeometry().setFromPoints(batonPts);
        var batonMat = new THREE.LineBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0
        });
        this._baton = new THREE.Line(batonGeo, batonMat);
        this._baton.position.set(ox + 0.05, oy + 0.05, 0.03);
        scene.add(this._baton);

        // Instrument sections (clusters of colored particles in arranged positions)
        // Strings (left), Brass (center-left), Woodwinds (center-right), Percussion (right)
        this._sections = [];
        var sectionDefs = [
            { name: 'strings', cx: ox - 0.35, cy: oy - 0.15, color: 0xcc6644, count: 8, cueStart: 0.15 },
            { name: 'brass', cx: ox - 0.15, cy: oy - 0.2, color: 0xddaa33, count: 6, cueStart: 0.30 },
            { name: 'woodwinds', cx: ox + 0.05, cy: oy - 0.2, color: 0x44aa88, count: 6, cueStart: 0.42 },
            { name: 'percussion', cx: ox + 0.25, cy: oy - 0.15, color: 0x8844cc, count: 5, cueStart: 0.52 }
        ];
        var partGeo = new THREE.SphereGeometry(0.012, 6, 6);
        for (var si = 0; si < sectionDefs.length; si++) {
            var section = { def: sectionDefs[si], particles: [], active: false };
            for (var pi = 0; pi < sectionDefs[si].count; pi++) {
                var pMat = new THREE.MeshBasicMaterial({
                    color: sectionDefs[si].color, transparent: true, opacity: 0,
                    blending: THREE.AdditiveBlending, depthWrite: false
                });
                var part = new THREE.Mesh(partGeo, pMat);
                var angle = (pi / sectionDefs[si].count) * Math.PI * 0.8 - Math.PI * 0.4;
                var dist = 0.04 + Math.random() * 0.03;
                part.position.set(
                    sectionDefs[si].cx + Math.cos(angle) * dist,
                    sectionDefs[si].cy + Math.sin(angle) * dist * 0.5,
                    0.01
                );
                part.visible = false;
                scene.add(part);
                section.particles.push({
                    mesh: part,
                    baseX: part.position.x,
                    baseY: part.position.y,
                    phase: Math.random() * Math.PI * 2
                });
            }
            this._sections.push(section);
        }

        // Music wave rings (expanding from model when conducting)
        this._waveRings = [];
        var ringGeo = new THREE.TorusGeometry(0.05, 0.004, 6, 20);
        for (var wi = 0; wi < 10; wi++) {
            var wMat = new THREE.MeshBasicMaterial({
                color: 0xffcc66, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ring = new THREE.Mesh(ringGeo, wMat);
            ring.visible = false;
            scene.add(ring);
            this._waveRings.push({
                mesh: ring, life: 0, maxLife: 0
            });
        }
        this._ringIdx = 0;
        this._lastRing = 0;

        // Concert hall gold glow
        var glowGeo = new THREE.SphereGeometry(0.4, 14, 14);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xffcc44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glow = new THREE.Mesh(glowGeo, glowMat);
        this._glow.position.set(ox, oy - 0.05, -0.05);
        scene.add(this._glow);

        this._batonAngle = 0;
    },
    _emitWaveRing(x, y) {
        var r = this._waveRings[this._ringIdx % this._waveRings.length];
        this._ringIdx++;
        r.mesh.visible = true;
        r.mesh.position.set(x, y, 0.02);
        r.mesh.scale.setScalar(0.5);
        r.life = 0.8;
        r.maxLife = 0.8;
        r.mesh.material.opacity = 0.5;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        // Baton sweep
        this._batonAngle = Math.sin(time * 2.5) * 0.4;
        this._baton.rotation.z = this._batonAngle;

        if (progress < 0.10) {
            // Phase 1: Conductor stance, baton appears
            var t = progress / 0.10;
            this._baton.material.opacity = t * 0.7;
            // Show section positions dimly
            for (var si = 0; si < this._sections.length; si++) {
                for (var pi = 0; pi < this._sections[si].particles.length; pi++) {
                    this._sections[si].particles[pi].mesh.visible = true;
                    this._sections[si].particles[pi].mesh.material.opacity = t * 0.15;
                }
            }
            model.position.set(ox + 0.05, oy + 0.05, oz);
        } else if (progress < 0.60) {
            // Phase 2: Each section activates on cue
            var t2 = (progress - 0.10) / 0.50;
            this._baton.material.opacity = 0.7;

            for (var si2 = 0; si2 < this._sections.length; si2++) {
                var sect = this._sections[si2];
                var cueProgress = (progress - sect.def.cueStart);
                var isActive = cueProgress > 0;

                for (var pi2 = 0; pi2 < sect.particles.length; pi2++) {
                    var p = sect.particles[pi2];
                    if (isActive) {
                        var activateT = Math.min(1, cueProgress / 0.08);
                        p.mesh.material.opacity = 0.15 + activateT * 0.45;
                        // Active particles bounce to the beat
                        var beatPhase = Math.sin(time * 3 + p.phase);
                        p.mesh.position.y = p.baseY + beatPhase * 0.01 * activateT;
                        p.mesh.scale.setScalar(0.8 + activateT * 0.4 + beatPhase * 0.15);
                    } else {
                        p.mesh.material.opacity = 0.15;
                        p.mesh.scale.setScalar(0.8);
                    }
                }

                // Emit wave ring when section activates
                if (isActive && cueProgress < 0.02 && !sect.active) {
                    sect.active = true;
                    this._emitWaveRing(sect.def.cx, sect.def.cy);
                }
            }

            // Conductor motion
            model.position.set(
                ox + 0.05 + Math.sin(time * 2.5) * 0.02,
                oy + 0.05 + Math.cos(time * 1.8) * 0.015,
                oz
            );
            model.rotation.z = Math.sin(time * 2.5) * 0.03;

            // Periodic wave rings from baton
            if (time - this._lastRing > 0.5) {
                this._emitWaveRing(ox + 0.05, oy + 0.05);
                this._lastRing = time;
            }

            this._glow.material.opacity = t2 * 0.05;
        } else if (progress < 0.85) {
            // Phase 3: All sections playing together - rising dynamics
            var t3 = (progress - 0.60) / 0.25;
            var crescendo = Math.sin(t3 * Math.PI * 0.5);
            var fullBeat = Math.sin(time * 4);

            this._baton.material.opacity = 0.7 + crescendo * 0.3;
            this._baton.rotation.z = Math.sin(time * 3) * (0.4 + crescendo * 0.2);

            for (var si3 = 0; si3 < this._sections.length; si3++) {
                for (var pi3 = 0; pi3 < this._sections[si3].particles.length; pi3++) {
                    var p3 = this._sections[si3].particles[pi3];
                    p3.mesh.material.opacity = 0.5 + crescendo * 0.3 + fullBeat * 0.1;
                    p3.mesh.position.y = p3.baseY + Math.sin(time * 4 + p3.phase) * 0.015 * (1 + crescendo);
                    p3.mesh.scale.setScalar(1.0 + crescendo * 0.3 + fullBeat * 0.15);

                    // Color brightens
                    var brightFactor = 0.2 + crescendo * 0.3;
                    var origColor = this._sections[si3].def.color;
                    var r = ((origColor >> 16) & 0xff) / 255;
                    var g = ((origColor >> 8) & 0xff) / 255;
                    var b = (origColor & 0xff) / 255;
                    p3.mesh.material.color.setRGB(
                        Math.min(1, r + brightFactor),
                        Math.min(1, g + brightFactor),
                        Math.min(1, b + brightFactor)
                    );
                }
            }

            // More wave rings
            if (time - this._lastRing > 0.3 - crescendo * 0.15) {
                this._emitWaveRing(ox + 0.05, oy + 0.05);
                this._lastRing = time;
            }

            this._glow.material.opacity = 0.05 + crescendo * 0.12;
            this._glow.scale.setScalar(1 + crescendo * 0.5);

            model.position.set(
                ox + 0.05 + Math.sin(time * 3) * 0.025,
                oy + 0.05 + Math.cos(time * 2.2) * 0.02,
                oz
            );
            model.rotation.z = Math.sin(time * 3) * 0.05;
        } else {
            // Phase 4: Fade out
            var t4 = (progress - 0.85) / 0.15;
            var fadeOut = 1 - t4;
            this._baton.material.opacity = 0.7 * fadeOut;
            for (var si4 = 0; si4 < this._sections.length; si4++) {
                for (var pi4 = 0; pi4 < this._sections[si4].particles.length; pi4++) {
                    this._sections[si4].particles[pi4].mesh.material.opacity *= fadeOut;
                }
            }
            this._glow.material.opacity *= fadeOut;
            model.position.set(
                ox + 0.05 * fadeOut,
                oy + 0.05 * fadeOut,
                oz
            );
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update wave rings
        for (var wi = 0; wi < this._waveRings.length; wi++) {
            var wr = this._waveRings[wi];
            if (wr.life <= 0) continue;
            wr.life -= delta;
            if (wr.life <= 0) { wr.mesh.visible = false; continue; }
            var wlr = wr.life / wr.maxLife;
            wr.mesh.material.opacity = wlr * 0.4;
            wr.mesh.scale.setScalar(0.5 + (1 - wlr) * 3.0);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._baton) { scene.remove(this._baton); this._baton.geometry.dispose(); this._baton.material.dispose(); }
        if (this._sections) {
            this._sections.forEach(function(s) {
                s.particles.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); });
            });
        }
        if (this._waveRings) {
            this._waveRings.forEach(function(w) { scene.remove(w.mesh); w.mesh.geometry.dispose(); w.mesh.material.dispose(); });
        }
        if (this._glow) { scene.remove(this._glow); this._glow.geometry.dispose(); this._glow.material.dispose(); }
        this._baton = this._sections = this._waveRings = this._glow = null;
    }
};
