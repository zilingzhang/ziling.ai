export default {
    name: 'Tinkering',
    label: 'tinkering',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Gadget (wireframe box with exposed internals)
        var gadgetGeo = new THREE.BoxGeometry(0.2, 0.15, 0.1);
        var gadgetMat = new THREE.MeshBasicMaterial({
            color: 0x888899, transparent: true, opacity: 0,
            wireframe: true
        });
        this._gadget = new THREE.Mesh(gadgetGeo, gadgetMat);
        this._gadget.position.set(ox - 0.2, oy - 0.05, 0);
        scene.add(this._gadget);

        // Internal parts (small shapes that can be adjusted)
        this._parts = [];
        var partDefs = [
            { geo: new THREE.BoxGeometry(0.03, 0.03, 0.03), color: 0xcc6644, x: -0.04, y: 0.02 },
            { geo: new THREE.SphereGeometry(0.02, 6, 6), color: 0x44cc88, x: 0.03, y: -0.02 },
            { geo: new THREE.CylinderGeometry(0.01, 0.01, 0.04, 6), color: 0x8888cc, x: -0.02, y: -0.03 },
            { geo: new THREE.TorusGeometry(0.015, 0.004, 6, 12), color: 0xccaa44, x: 0.05, y: 0.03 },
            { geo: new THREE.OctahedronGeometry(0.018, 0), color: 0xcc44aa, x: -0.06, y: 0 },
            { geo: new THREE.BoxGeometry(0.04, 0.015, 0.02), color: 0x44aacc, x: 0, y: 0.04 }
        ];
        for (var pi = 0; pi < partDefs.length; pi++) {
            var pMat = new THREE.MeshBasicMaterial({
                color: partDefs[pi].color, transparent: true, opacity: 0
            });
            var part = new THREE.Mesh(partDefs[pi].geo, pMat);
            part.position.set(
                ox - 0.2 + partDefs[pi].x,
                oy - 0.05 + partDefs[pi].y,
                0.02
            );
            part.visible = false;
            scene.add(part);
            this._parts.push({
                mesh: part,
                origX: ox - 0.2 + partDefs[pi].x,
                origY: oy - 0.05 + partDefs[pi].y,
                adjusting: false,
                wobblePhase: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 2
            });
        }

        // Spark/fail particles
        this._sparks = [];
        var sparkGeo = new THREE.SphereGeometry(0.006, 4, 4);
        for (var si = 0; si < 20; si++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: si % 2 === 0 ? 0xffcc44 : 0xff6644,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spark = new THREE.Mesh(sparkGeo, sMat);
            spark.visible = false;
            scene.add(spark);
            this._sparks.push({
                mesh: spark, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._sparkIdx = 0;

        // Machine hum glow (satisfaction glow)
        var glowGeo = new THREE.SphereGeometry(0.25, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xffaa55, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glow = new THREE.Mesh(glowGeo, glowMat);
        this._glow.position.set(ox - 0.2, oy - 0.05, -0.05);
        scene.add(this._glow);

        // Running indicator (small spinning torus when machine works)
        var runGeo = new THREE.TorusGeometry(0.025, 0.005, 6, 16);
        var runMat = new THREE.MeshBasicMaterial({
            color: 0x44ff88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._runIndicator = new THREE.Mesh(runGeo, runMat);
        this._runIndicator.position.set(ox - 0.2, oy - 0.15, 0.03);
        scene.add(this._runIndicator);

        this._attemptNum = 0;
        this._gadgetWorking = false;
    },
    _emitSpark(x, y, count) {
        for (var i = 0; i < count; i++) {
            var s = this._sparks[this._sparkIdx % this._sparks.length];
            this._sparkIdx++;
            s.mesh.visible = true;
            s.mesh.position.set(x + (Math.random() - 0.5) * 0.03, y + (Math.random() - 0.5) * 0.03, 0.03);
            var a = Math.random() * Math.PI * 2;
            var spd = 0.3 + Math.random() * 0.8;
            s.vx = Math.cos(a) * spd;
            s.vy = Math.sin(a) * spd;
            s.life = 0.2 + Math.random() * 0.2;
            s.maxLife = s.life;
            s.mesh.material.opacity = 0.8;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        if (progress < 0.10) {
            // Phase 1: Gadget appears with internals
            var t = progress / 0.10;
            this._gadget.material.opacity = t * 0.5;
            for (var pi = 0; pi < this._parts.length; pi++) {
                var pDelay = pi * 0.1;
                var pT = Math.max(0, Math.min(1, (t - pDelay) / 0.5));
                this._parts[pi].mesh.visible = pT > 0;
                this._parts[pi].mesh.material.opacity = pT * 0.5;
            }
            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.30) {
            // Phase 2: First attempt - model adjusts parts
            var t2 = (progress - 0.10) / 0.20;
            this._gadget.material.opacity = 0.5;

            // Adjust parts (move them slightly)
            for (var pi2 = 0; pi2 < this._parts.length; pi2++) {
                var p = this._parts[pi2];
                p.mesh.material.opacity = 0.5;
                if (t2 > pi2 * 0.12 && t2 < pi2 * 0.12 + 0.10) {
                    // Being adjusted
                    var adjT = (t2 - pi2 * 0.12) / 0.10;
                    p.mesh.position.x = p.origX + Math.sin(adjT * Math.PI * 2) * 0.02;
                    p.mesh.position.y = p.origY + Math.cos(adjT * Math.PI * 3) * 0.01;
                    p.mesh.rotation.z += delta * 5;
                }
            }

            model.position.set(ox + 0.1, oy + Math.sin(time * 2) * 0.005, oz);
            model.rotation.z = Math.sin(time * 1.5) * 0.02;
        } else if (progress < 0.42) {
            // Phase 3: First attempt fails - sparks + wobble
            var t3 = (progress - 0.30) / 0.12;

            if (t3 < 0.15 && this._attemptNum === 0) {
                this._attemptNum = 1;
                this._emitSpark(ox - 0.2, oy - 0.05, 5);
            }

            // Gadget wobbles on failure
            var wobble = Math.sin(t3 * Math.PI * 6) * Math.max(0, 1 - t3 * 1.5);
            this._gadget.rotation.z = wobble * 0.08;

            // Parts jolt
            for (var pi3 = 0; pi3 < this._parts.length; pi3++) {
                this._parts[pi3].mesh.position.x = this._parts[pi3].origX + wobble * 0.01;
            }

            model.position.set(ox + 0.1 + wobble * 0.01, oy, oz);
        } else if (progress < 0.58) {
            // Phase 4: Try again differently
            var t4 = (progress - 0.42) / 0.16;
            this._gadget.rotation.z = 0;

            // Rearrange parts in a different order
            for (var pi4 = 0; pi4 < this._parts.length; pi4++) {
                var p4 = this._parts[pi4];
                var revIdx = this._parts.length - 1 - pi4;
                if (t4 > revIdx * 0.12 && t4 < revIdx * 0.12 + 0.10) {
                    var adjT4 = (t4 - revIdx * 0.12) / 0.10;
                    p4.mesh.position.x = p4.origX + Math.sin(adjT4 * Math.PI * 4) * 0.015;
                    p4.mesh.rotation.z += delta * 3;
                }
                p4.mesh.position.x += (p4.origX - p4.mesh.position.x) * delta * 2;
                p4.mesh.position.y += (p4.origY - p4.mesh.position.y) * delta * 2;
            }

            model.position.set(ox + 0.1, oy + Math.sin(time * 2) * 0.005, oz);
        } else if (progress < 0.68) {
            // Phase 5: Second attempt fails (smaller failure)
            var t5 = (progress - 0.58) / 0.10;

            if (t5 < 0.15 && this._attemptNum === 1) {
                this._attemptNum = 2;
                this._emitSpark(ox - 0.2, oy - 0.05, 3);
            }

            var wobble5 = Math.sin(t5 * Math.PI * 4) * Math.max(0, 1 - t5 * 2) * 0.5;
            this._gadget.rotation.z = wobble5 * 0.05;

            model.position.set(ox + 0.1, oy, oz);
        } else if (progress < 0.80) {
            // Phase 6: Third attempt - gradual improvement
            var t6 = (progress - 0.68) / 0.12;
            this._gadget.rotation.z = 0;

            for (var pi6 = 0; pi6 < this._parts.length; pi6++) {
                var p6 = this._parts[pi6];
                // Parts settle into correct positions
                p6.mesh.position.x += (p6.origX - p6.mesh.position.x) * delta * 4;
                p6.mesh.position.y += (p6.origY - p6.mesh.position.y) * delta * 4;
                p6.mesh.material.opacity = 0.5 + t6 * 0.2;
                // Parts start humming (small vibration)
                var hum = Math.sin(time * 8 + pi6 * 2) * 0.002 * t6;
                p6.mesh.position.y += hum;
            }

            // Machine starts working
            this._runIndicator.material.opacity = t6 * 0.4;
            this._runIndicator.rotation.z = time * 3;

            model.position.set(ox + 0.1, oy + Math.sin(time * 1.5) * 0.003, oz);
        } else if (progress < 0.92) {
            // Phase 7: Machine hums to life - satisfaction glow
            var t7 = (progress - 0.80) / 0.12;
            var humPulse = Math.sin(t7 * Math.PI * 4);
            this._gadgetWorking = true;

            // All parts vibrate in harmony
            for (var pi7 = 0; pi7 < this._parts.length; pi7++) {
                var p7 = this._parts[pi7];
                p7.mesh.material.opacity = 0.7 + humPulse * 0.1;
                p7.mesh.position.y = p7.origY + Math.sin(time * 8 + pi7 * 1.5) * 0.003;
                // Color warms up
                p7.mesh.material.color.offsetHSL(0, 0, delta * 0.1);
            }

            // Gadget solidifies
            this._gadget.material.opacity = 0.5 + humPulse * 0.1;

            // Run indicator spins fast
            this._runIndicator.material.opacity = 0.5 + humPulse * 0.2;
            this._runIndicator.rotation.z = time * 5;

            // Satisfaction glow
            this._glow.material.opacity = t7 * 0.12 + humPulse * 0.04;
            this._glow.scale.setScalar(1 + t7 * 0.3);

            model.position.set(ox + 0.1, oy, oz);
        } else {
            // Phase 8: Fade out
            var t8 = (progress - 0.92) / 0.08;
            var fadeOut = 1 - t8;
            this._gadget.material.opacity *= fadeOut;
            for (var pi8 = 0; pi8 < this._parts.length; pi8++) {
                this._parts[pi8].mesh.material.opacity *= fadeOut;
            }
            this._runIndicator.material.opacity *= fadeOut;
            this._glow.material.opacity *= fadeOut;
            model.position.set(ox + 0.1 * fadeOut, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update sparks
        for (var si = 0; si < this._sparks.length; si++) {
            var sp = this._sparks[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            sp.vy -= 2.0 * delta;
            var lr = sp.life / sp.maxLife;
            sp.mesh.material.opacity = lr * 0.7;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._gadget) { scene.remove(this._gadget); this._gadget.geometry.dispose(); this._gadget.material.dispose(); }
        if (this._parts) {
            this._parts.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); });
        }
        if (this._sparks) {
            this._sparks.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
        }
        if (this._glow) { scene.remove(this._glow); this._glow.geometry.dispose(); this._glow.material.dispose(); }
        if (this._runIndicator) { scene.remove(this._runIndicator); this._runIndicator.geometry.dispose(); this._runIndicator.material.dispose(); }
        this._gadget = this._parts = this._sparks = this._glow = this._runIndicator = null;
    }
};
