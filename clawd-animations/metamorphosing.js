export default {
    name: 'Metamorphosing',
    label: 'metamorphosing',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Cocoon shell (sphere that closes around model)
        var cocoonGeo = new THREE.SphereGeometry(0.2, 16, 16);
        var cocoonMat = new THREE.MeshBasicMaterial({
            color: 0x556633, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        });
        this._cocoon = new THREE.Mesh(cocoonGeo, cocoonMat);
        this._cocoon.position.set(ox, oy, 0);
        scene.add(this._cocoon);

        // Inner transformation glow
        var innerGeo = new THREE.SphereGeometry(0.15, 12, 12);
        var innerMat = new THREE.MeshBasicMaterial({
            color: 0xff44aa, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._innerGlow = new THREE.Mesh(innerGeo, innerMat);
        this._innerGlow.position.set(ox, oy, 0);
        scene.add(this._innerGlow);

        // Wings (two flat discs that expand)
        this._wings = [];
        var wingGeo = new THREE.CircleGeometry(0.18, 16);
        var wingColors = [0xff66cc, 0xaa44ff];
        for (var i = 0; i < 2; i++) {
            var wMat = new THREE.MeshBasicMaterial({
                color: wingColors[i], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            var wing = new THREE.Mesh(wingGeo, wMat);
            wing.position.set(ox, oy, 0);
            wing.visible = false;
            scene.add(wing);
            this._wings.push(wing);
        }

        // Crack lines (lines on cocoon surface)
        this._cracks = [];
        for (var j = 0; j < 6; j++) {
            var p1 = new THREE.Vector3(ox + (Math.random() - 0.5) * 0.15, oy + (Math.random() - 0.5) * 0.15, 0.15);
            var p2 = new THREE.Vector3(p1.x + (Math.random() - 0.5) * 0.12, p1.y + (Math.random() - 0.5) * 0.12, 0.15);
            var cGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
            var cMat = new THREE.LineBasicMaterial({
                color: 0xffcc44, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending
            });
            var crack = new THREE.Line(cGeo, cMat);
            crack.visible = false;
            scene.add(crack);
            this._cracks.push(crack);
        }

        // Shed particles (old form shedding)
        this._shedParts = [];
        var shedGeo = new THREE.PlaneGeometry(0.02, 0.02);
        for (var k = 0; k < 30; k++) {
            var sColors = [0x556633, 0x667744, 0x445522, 0x778855];
            var sMat = new THREE.MeshBasicMaterial({
                color: sColors[k % sColors.length], transparent: true, opacity: 0,
                depthWrite: false, side: THREE.DoubleSide
            });
            var shed = new THREE.Mesh(shedGeo, sMat);
            shed.visible = false;
            scene.add(shed);
            this._shedParts.push({ mesh: shed, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0 });
        }
        this._shedIdx = 0;

        // Rainbow transformation particles
        this._rainbowParts = [];
        var rbGeo = new THREE.SphereGeometry(0.015, 4, 4);
        var rbColors = [0xff4444, 0xff8844, 0xffff44, 0x44ff44, 0x4444ff, 0x8844ff, 0xff44ff];
        for (var m = 0; m < 35; m++) {
            var rMat = new THREE.MeshBasicMaterial({
                color: rbColors[m % rbColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var rb = new THREE.Mesh(rbGeo, rMat);
            rb.visible = false;
            scene.add(rb);
            this._rainbowParts.push({ mesh: rb, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
        }
        this._rbIdx = 0;

        this._lastShed = 0;
        this._lastRainbow = 0;
    },
    _emitShed(x, y) {
        for (var i = 0; i < 4; i++) {
            var s = this._shedParts[this._shedIdx % this._shedParts.length];
            this._shedIdx++;
            s.mesh.visible = true;
            s.mesh.position.set(x + (Math.random() - 0.5) * 0.15, y + (Math.random() - 0.5) * 0.15, 0.1);
            var a = Math.random() * Math.PI * 2;
            var spd = 0.5 + Math.random() * 1.5;
            s.vx = Math.cos(a) * spd;
            s.vy = Math.sin(a) * spd;
            s.vz = (Math.random() - 0.5) * 0.5;
            s.rx = (Math.random() - 0.5) * 8;
            s.ry = (Math.random() - 0.5) * 8;
            s.life = 0.8 + Math.random() * 0.5;
            s.maxLife = s.life;
            s.mesh.material.opacity = 0.7;
        }
    },
    _emitRainbow(x, y) {
        for (var i = 0; i < 5; i++) {
            var r = this._rainbowParts[this._rbIdx % this._rainbowParts.length];
            this._rbIdx++;
            r.mesh.visible = true;
            r.mesh.position.set(x + (Math.random() - 0.5) * 0.1, y + (Math.random() - 0.5) * 0.1, 0);
            var a = Math.random() * Math.PI * 2;
            var spd = 1.0 + Math.random() * 2.0;
            r.vx = Math.cos(a) * spd;
            r.vy = Math.sin(a) * spd;
            r.vz = (Math.random() - 0.5) * 1.0;
            r.life = 0.5 + Math.random() * 0.5;
            r.maxLife = r.life;
            r.mesh.material.opacity = 1.0;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.10) {
            // Phase 1: Model wraps in cocoon
            var t = progress / 0.10;
            this._cocoon.material.opacity = t * 0.5;
            this._cocoon.scale.setScalar(1.5 - t * 0.5);
            model.scale.set(this._origScale.x * (1 - t * 0.15), this._origScale.y * (1 - t * 0.15), this._origScale.z);
            model.position.set(ox, oy, oz);
        } else if (progress < 0.25) {
            // Phase 2: Cocoon closed, model hidden inside
            var t2 = (progress - 0.10) / 0.15;
            this._cocoon.material.opacity = 0.5 + t2 * 0.2;
            this._cocoon.scale.setScalar(1.0);
            model.visible = t2 < 0.3;
            model.position.set(ox, oy, oz);
        } else if (progress < 0.45) {
            // Phase 3: Internal transformation glow pulses
            var t3 = (progress - 0.25) / 0.20;
            model.visible = false;
            this._cocoon.material.opacity = 0.7;
            this._cocoon.scale.setScalar(1 + Math.sin(time * 4) * 0.05);

            // Inner glow pulses with changing colors
            this._innerGlow.material.opacity = 0.3 + Math.sin(time * 5) * 0.2;
            var colorPhase = (Math.sin(time * 2) + 1) * 0.5;
            if (colorPhase < 0.33) {
                this._innerGlow.material.color.setHex(0xff44aa);
            } else if (colorPhase < 0.66) {
                this._innerGlow.material.color.setHex(0xaa44ff);
            } else {
                this._innerGlow.material.color.setHex(0x44aaff);
            }
            this._innerGlow.scale.setScalar(0.8 + Math.sin(time * 5) * 0.2);
        } else if (progress < 0.55) {
            // Phase 4: Chrysalis cracks
            var t4 = (progress - 0.45) / 0.10;
            model.visible = false;
            this._cocoon.material.opacity = 0.7;

            // Cracks appear
            for (var ci = 0; ci < this._cracks.length; ci++) {
                var crDelay = ci * 0.12;
                if (t4 > crDelay) {
                    this._cracks[ci].visible = true;
                    this._cracks[ci].material.opacity = Math.min(0.8, (t4 - crDelay) * 4);
                }
            }

            // Inner glow intensifies
            this._innerGlow.material.opacity = 0.5 + t4 * 0.3;
            this._innerGlow.material.color.setHex(0xffdd44);

            // Shed particles from cracks
            if (time - this._lastShed > 0.1) {
                this._emitShed(ox, oy);
                this._lastShed = time;
            }
        } else if (progress < 0.70) {
            // Phase 5: Wings unfold, cocoon breaks apart
            var t5 = (progress - 0.55) / 0.15;

            // Cocoon fades and breaks
            this._cocoon.material.opacity = 0.7 * (1 - t5);
            this._cocoon.scale.setScalar(1 + t5 * 0.5);
            this._innerGlow.material.opacity = 0.8 * (1 - t5);

            // Cracks fade
            for (var cj = 0; cj < this._cracks.length; cj++) {
                this._cracks[cj].material.opacity = 0.8 * (1 - t5);
            }

            // Wings expand outward
            for (var wi = 0; wi < this._wings.length; wi++) {
                this._wings[wi].visible = true;
                var wingSpread = t5;
                var wingX = ox + (wi === 0 ? -1 : 1) * wingSpread * 0.3;
                this._wings[wi].position.set(wingX, oy + 0.05, 0.01);
                this._wings[wi].scale.set(wingSpread, wingSpread * 0.8, 1);
                this._wings[wi].material.opacity = wingSpread * 0.6;
                this._wings[wi].rotation.y = (wi === 0 ? -1 : 1) * (1 - wingSpread) * 1.2;
            }

            // Model reappears, larger
            model.visible = t5 > 0.3;
            model.scale.set(this._origScale.x * (1 + t5 * 0.2), this._origScale.y * (1 + t5 * 0.2), this._origScale.z);
            model.position.set(ox, oy + t5 * 0.1, oz);

            // Shed particles
            if (time - this._lastShed > 0.08) {
                this._emitShed(ox, oy);
                this._lastShed = time;
            }
        } else if (progress < 0.85) {
            // Phase 6: New form emerges, colorful, first flight attempt
            var t6 = (progress - 0.70) / 0.15;
            model.visible = true;
            model.scale.set(this._origScale.x * 1.2, this._origScale.y * 1.2, this._origScale.z);

            // Fluttering flight
            var flutterX = Math.sin(time * 5) * 0.15;
            var flutterY = Math.sin(time * 3) * 0.1 + 0.15;
            model.position.set(ox + flutterX, oy + flutterY, oz);
            model.rotation.z = Math.sin(time * 5) * 0.08;

            // Wings flutter
            for (var wj = 0; wj < this._wings.length; wj++) {
                var flapAngle = Math.sin(time * 8) * 0.4;
                this._wings[wj].position.set(
                    ox + flutterX + (wj === 0 ? -1 : 1) * 0.3,
                    oy + flutterY + 0.05, 0.01
                );
                this._wings[wj].rotation.y = (wj === 0 ? -1 : 1) * flapAngle;
                this._wings[wj].material.opacity = 0.6;
                this._wings[wj].scale.set(1, 0.8, 1);
            }

            // Rainbow particles
            if (time - this._lastRainbow > 0.06) {
                this._emitRainbow(ox + flutterX, oy + flutterY);
                this._lastRainbow = time;
            }
        } else {
            // Phase 7: Settle and fade
            var t7 = (progress - 0.85) / 0.15;

            model.visible = true;
            model.position.set(ox, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            for (var wk = 0; wk < this._wings.length; wk++) {
                this._wings[wk].material.opacity = 0.6 * (1 - t7);
            }
            this._cocoon.material.opacity = 0;
            this._innerGlow.material.opacity = 0;
        }

        // Update shed particles
        for (var si = 0; si < this._shedParts.length; si++) {
            var sp = this._shedParts[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            sp.mesh.position.z += sp.vz * delta;
            sp.vy -= 0.5 * delta;
            sp.mesh.rotation.x += sp.rx * delta;
            sp.mesh.rotation.y += sp.ry * delta;
            sp.mesh.material.opacity = 0.7 * (sp.life / sp.maxLife);
        }

        // Update rainbow particles
        for (var ri = 0; ri < this._rainbowParts.length; ri++) {
            var rp = this._rainbowParts[ri];
            if (rp.life <= 0) continue;
            rp.life -= delta;
            if (rp.life <= 0) { rp.mesh.visible = false; continue; }
            rp.mesh.position.x += rp.vx * delta;
            rp.mesh.position.y += rp.vy * delta;
            rp.mesh.position.z += rp.vz * delta;
            rp.vy -= 1.5 * delta;
            rp.mesh.material.opacity = rp.life / rp.maxLife;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._cocoon) { scene.remove(this._cocoon); this._cocoon.geometry.dispose(); this._cocoon.material.dispose(); }
        if (this._innerGlow) { scene.remove(this._innerGlow); this._innerGlow.geometry.dispose(); this._innerGlow.material.dispose(); }
        if (this._wings) {
            this._wings.forEach(function(w) { scene.remove(w); w.geometry.dispose(); w.material.dispose(); });
        }
        if (this._cracks) {
            this._cracks.forEach(function(c) { scene.remove(c); c.geometry.dispose(); c.material.dispose(); });
        }
        if (this._shedParts) {
            this._shedParts.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
        }
        if (this._rainbowParts) {
            this._rainbowParts.forEach(function(r) { scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); });
        }
        this._cocoon = this._innerGlow = this._wings = this._cracks = this._shedParts = this._rainbowParts = null;
    }
};
