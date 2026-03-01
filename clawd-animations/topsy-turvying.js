export default {
    name: 'Topsy-Turvying',
    label: 'topsy-turvying',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Floating objects that will reverse gravity
        this._floaters = [];
        var floatDefs = [
            { geo: new THREE.BoxGeometry(0.04, 0.04, 0.04), color: 0x6688aa },
            { geo: new THREE.SphereGeometry(0.025, 6, 6), color: 0xaa8866 },
            { geo: new THREE.ConeGeometry(0.02, 0.05, 5), color: 0x88aa66 },
            { geo: new THREE.BoxGeometry(0.05, 0.03, 0.03), color: 0xaa6688 },
            { geo: new THREE.SphereGeometry(0.03, 6, 6), color: 0x6688cc },
            { geo: new THREE.BoxGeometry(0.03, 0.05, 0.03), color: 0xcc8844 },
            { geo: new THREE.ConeGeometry(0.025, 0.04, 4), color: 0x44aa88 },
            { geo: new THREE.SphereGeometry(0.02, 6, 6), color: 0xaaaa44 }
        ];
        for (var i = 0; i < 8; i++) {
            var fMat = new THREE.MeshBasicMaterial({
                color: floatDefs[i].color, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var fMesh = new THREE.Mesh(floatDefs[i].geo, fMat);
            fMesh.visible = false;
            scene.add(fMesh);
            this._floaters.push({
                mesh: fMesh,
                groundX: ox + (Math.random() - 0.5) * 0.8,
                groundY: oy - 0.15 + (Math.random() - 0.5) * 0.05,
                ceilY: oy + 0.3 + Math.random() * 0.1,
                fallVel: 0,
                onGround: true
            });
        }

        // Brain hurt spirals (torus particles)
        this._spirals = [];
        var spiralGeo = new THREE.TorusGeometry(0.02, 0.004, 4, 10);
        for (var s = 0; s < 6; s++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: s % 2 === 0 ? 0xffaa44 : 0xff6688, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sMesh = new THREE.Mesh(spiralGeo, sMat);
            sMesh.visible = false;
            scene.add(sMesh);
            this._spirals.push({
                mesh: sMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, spinRate: 0
            });
        }
        this._spiralIdx = 0;
        this._lastSpiral = 0;

        // Upward-falling particles (gravity reversed)
        this._upParts = [];
        var upGeo = new THREE.SphereGeometry(0.008, 4, 4);
        for (var u = 0; u < 15; u++) {
            var uMat = new THREE.MeshBasicMaterial({
                color: 0xaabbcc, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var uMesh = new THREE.Mesh(upGeo, uMat);
            uMesh.visible = false;
            scene.add(uMesh);
            this._upParts.push({
                mesh: uMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._upIdx = 0;
        this._lastUp = 0;

        // Ground/ceiling line indicators
        var lineGeo = new THREE.BoxGeometry(1.0, 0.003, 0.001);
        var groundMat = new THREE.MeshBasicMaterial({
            color: 0x888888, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._groundLine = new THREE.Mesh(lineGeo, groundMat);
        this._groundLine.position.set(ox, oy - 0.18, 0);
        this._groundLine.visible = false;
        scene.add(this._groundLine);

        var ceilMat = new THREE.MeshBasicMaterial({
            color: 0x888888, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._ceilLine = new THREE.Mesh(lineGeo.clone(), ceilMat);
        this._ceilLine.position.set(ox, oy + 0.35, 0);
        this._ceilLine.visible = false;
        scene.add(this._ceilLine);

        // Disorienting snap flash
        var snapGeo = new THREE.SphereGeometry(0.5, 10, 10);
        var snapMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._snapFlash = new THREE.Mesh(snapGeo, snapMat);
        this._snapFlash.position.set(ox, oy, 0);
        scene.add(this._snapFlash);

        // Inverted palette glow
        var invGeo = new THREE.SphereGeometry(0.4, 10, 10);
        var invMat = new THREE.MeshBasicMaterial({
            color: 0x4466aa, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._invertGlow = new THREE.Mesh(invGeo, invMat);
        this._invertGlow.position.set(ox, oy, 0);
        scene.add(this._invertGlow);

        this._gravityDir = 1; // 1 = normal, -1 = reversed
        this._flipProgress = 0;
    },
    _emitSpiral(x, y) {
        var s = this._spirals[this._spiralIdx % this._spirals.length];
        this._spiralIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x + (Math.random() - 0.5) * 0.1, y + 0.1, 0);
        s.vx = (Math.random() - 0.5) * 0.5;
        s.vy = 0.3 + Math.random() * 0.3;
        s.spinRate = 5 + Math.random() * 5;
        s.life = 0.5 + Math.random() * 0.3;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.6;
    },
    _emitUpParticle(x, y) {
        var u = this._upParts[this._upIdx % this._upParts.length];
        this._upIdx++;
        u.mesh.visible = true;
        u.mesh.position.set(x + (Math.random() - 0.5) * 0.3, y, 0);
        u.vx = (Math.random() - 0.5) * 0.3;
        u.vy = 0.5 + Math.random() * 0.8;
        u.life = 0.6 + Math.random() * 0.4;
        u.maxLife = u.life;
        u.mesh.material.opacity = 0.5;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;
        var ox = orig.x;
        var oy = orig.y;

        if (progress < 0.08) {
            // Phase 1: Normal scene, objects on ground
            var t = progress / 0.08;
            this._groundLine.visible = true;
            this._groundLine.material.opacity = t * 0.3;

            for (var i = 0; i < this._floaters.length; i++) {
                var fl = this._floaters[i];
                fl.mesh.visible = true;
                fl.mesh.material.opacity = t * 0.5;
                fl.mesh.position.set(fl.groundX, fl.groundY, 0);
            }
        } else if (progress < 0.25) {
            // Phase 2: Model starts to rotate upside-down
            var t2 = (progress - 0.08) / 0.17;
            var flipAngle = t2 * Math.PI;
            model.rotation.z = flipAngle;
            model.position.set(ox, oy + Math.sin(flipAngle) * 0.05, orig.z);

            // Objects start floating
            for (var i2 = 0; i2 < this._floaters.length; i2++) {
                var fl2 = this._floaters[i2];
                fl2.mesh.position.y = fl2.groundY + t2 * 0.05 * (i2 + 1) * 0.3;
                fl2.mesh.rotation.z = time * (1 + i2 * 0.3);
            }

            this._groundLine.material.opacity = 0.3;
            this._invertGlow.material.opacity = t2 * 0.05;
        } else if (progress < 0.40) {
            // Phase 3: Fully inverted - model upside-down, gravity reversed
            var t3 = (progress - 0.25) / 0.15;
            model.rotation.z = Math.PI;
            model.position.set(ox, oy + 0.05, orig.z);

            // Ceiling line appears
            this._ceilLine.visible = true;
            this._ceilLine.material.opacity = t3 * 0.3;

            // Objects float upward and slam to ceiling
            for (var i3 = 0; i3 < this._floaters.length; i3++) {
                var fl3 = this._floaters[i3];
                var floatT = Math.min(1, t3 * 2 + i3 * 0.05);
                var targetY = fl3.ceilY;
                fl3.mesh.position.y = fl3.groundY + (targetY - fl3.groundY) * floatT * floatT;
                fl3.mesh.rotation.z = time * 2 + i3;
                fl3.mesh.rotation.x = time * 1.5 + i3 * 0.5;
            }

            // Particles fall upward
            if (time - this._lastUp > 0.08) {
                this._emitUpParticle(ox + (Math.random() - 0.5) * 0.6, oy - 0.15);
                this._lastUp = time;
            }

            this._invertGlow.material.opacity = 0.05 + t3 * 0.05;
        } else if (progress < 0.58) {
            // Phase 4: Walking on ceiling, objects stuck to ceiling
            var t4 = (progress - 0.40) / 0.18;
            model.rotation.z = Math.PI;
            // Model walks along ceiling
            model.position.set(
                ox + Math.sin(time * 2) * 0.1,
                oy + 0.05 + Math.sin(time * 3) * 0.01,
                orig.z
            );

            // Objects on ceiling
            for (var i4 = 0; i4 < this._floaters.length; i4++) {
                var fl4 = this._floaters[i4];
                fl4.mesh.position.set(fl4.groundX, fl4.ceilY, 0);
                fl4.mesh.position.y += Math.sin(time * 2 + i4) * 0.005;
            }

            // Brain hurt spirals
            if (time - this._lastSpiral > 0.15) {
                this._emitSpiral(model.position.x, model.position.y);
                this._lastSpiral = time;
            }

            // Upward particles
            if (time - this._lastUp > 0.06) {
                this._emitUpParticle(ox + (Math.random() - 0.5) * 0.6, oy - 0.15);
                this._lastUp = time;
            }

            this._invertGlow.material.opacity = 0.1 + Math.sin(time * 2) * 0.02;
            this._groundLine.material.opacity = 0.3;
            this._ceilLine.material.opacity = 0.3;
        } else if (progress < 0.75) {
            // Phase 5: Snap back - disorienting flip back to normal
            var t5 = (progress - 0.58) / 0.17;

            // Flash at start
            if (t5 < 0.15) {
                this._snapFlash.material.opacity = (1 - t5 / 0.15) * 0.6;
                this._snapFlash.scale.setScalar(1 + t5 * 5);
            } else {
                this._snapFlash.material.opacity = 0;
            }

            // Model flips back
            var flipBack = Math.PI * (1 - t5);
            model.rotation.z = flipBack;
            model.position.set(ox, oy + 0.05 * (1 - t5), orig.z);

            // Objects fall back to ground
            for (var i5 = 0; i5 < this._floaters.length; i5++) {
                var fl5 = this._floaters[i5];
                var fallDelay = i5 * 0.08;
                var localFall = Math.max(0, Math.min(1, (t5 - fallDelay) * 3));
                var fallEase = localFall * localFall;
                fl5.mesh.position.y = fl5.ceilY + (fl5.groundY - fl5.ceilY) * fallEase;
                fl5.mesh.rotation.z = time * 3 * (1 - localFall);
            }

            // Spirals from disorientation
            if (time - this._lastSpiral > 0.1) {
                this._emitSpiral(model.position.x, model.position.y);
                this._lastSpiral = time;
            }

            this._invertGlow.material.opacity = 0.1 * (1 - t5);
            this._ceilLine.material.opacity = 0.3 * (1 - t5);
        } else if (progress < 0.90) {
            // Phase 6: Recovery - everything settles
            var t6 = (progress - 0.75) / 0.15;
            model.rotation.z = 0;
            model.position.set(ox, oy, orig.z);
            model.scale.setScalar(gs);

            // Objects settle on ground
            for (var i6 = 0; i6 < this._floaters.length; i6++) {
                var fl6 = this._floaters[i6];
                fl6.mesh.position.set(fl6.groundX, fl6.groundY, 0);
                fl6.mesh.rotation.z = 0;
                fl6.mesh.material.opacity = 0.5 * (1 - t6);
            }

            this._groundLine.material.opacity = 0.3 * (1 - t6);
            this._invertGlow.material.opacity = 0;
        } else {
            // Phase 7: Fade out
            var t7 = (progress - 0.90) / 0.10;
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            for (var i7 = 0; i7 < this._floaters.length; i7++) {
                this._floaters[i7].mesh.visible = false;
            }
            this._groundLine.visible = false;
            this._ceilLine.visible = false;
        }

        // Update brain hurt spirals
        for (var si = 0; si < this._spirals.length; si++) {
            var sp = this._spirals[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            sp.mesh.rotation.z = time * sp.spinRate;
            sp.mesh.material.opacity = (sp.life / sp.maxLife) * 0.5;
            sp.mesh.scale.setScalar(1 + (1 - sp.life / sp.maxLife) * 0.5);
        }

        // Update upward particles
        for (var ui = 0; ui < this._upParts.length; ui++) {
            var up = this._upParts[ui];
            if (up.life <= 0) continue;
            up.life -= delta;
            if (up.life <= 0) { up.mesh.visible = false; continue; }
            up.mesh.position.x += up.vx * delta;
            up.mesh.position.y += up.vy * delta;
            up.vy += 0.5 * delta;
            up.mesh.material.opacity = (up.life / up.maxLife) * 0.4;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._floaters) { this._floaters.forEach(function(f) { scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose(); }); }
        if (this._spirals) { this._spirals.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._upParts) { this._upParts.forEach(function(u) { scene.remove(u.mesh); u.mesh.geometry.dispose(); u.mesh.material.dispose(); }); }
        if (this._groundLine) { scene.remove(this._groundLine); this._groundLine.geometry.dispose(); this._groundLine.material.dispose(); }
        if (this._ceilLine) { scene.remove(this._ceilLine); this._ceilLine.geometry.dispose(); this._ceilLine.material.dispose(); }
        if (this._snapFlash) { scene.remove(this._snapFlash); this._snapFlash.geometry.dispose(); this._snapFlash.material.dispose(); }
        if (this._invertGlow) { scene.remove(this._invertGlow); this._invertGlow.geometry.dispose(); this._invertGlow.material.dispose(); }
        this._floaters = this._spirals = this._upParts = this._groundLine = this._ceilLine = this._snapFlash = this._invertGlow = null;
    }
};
