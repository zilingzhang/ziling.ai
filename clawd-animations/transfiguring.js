export default {
    name: 'Transfiguring',
    label: 'transfiguring',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Inner light glow
        var innerGeo = new THREE.SphereGeometry(0.12, 12, 12);
        var innerMat = new THREE.MeshBasicMaterial({
            color: 0xffdd66, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._innerLight = new THREE.Mesh(innerGeo, innerMat);
        this._innerLight.position.set(ox, oy, 0.05);
        scene.add(this._innerLight);

        // Crack lines (light radiating through)
        this._cracks = [];
        for (var i = 0; i < 8; i++) {
            var angle = (i / 8) * Math.PI * 2;
            var len = 0.1 + Math.random() * 0.08;
            var p1 = new THREE.Vector3(
                ox + Math.cos(angle) * 0.06,
                oy + Math.sin(angle) * 0.06,
                0.06
            );
            var p2 = new THREE.Vector3(
                ox + Math.cos(angle) * (0.06 + len),
                oy + Math.sin(angle) * (0.06 + len),
                0.06
            );
            var cGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
            var cMat = new THREE.LineBasicMaterial({
                color: 0xffee88, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending
            });
            var crack = new THREE.Line(cGeo, cMat);
            crack.visible = false;
            scene.add(crack);
            this._cracks.push({ line: crack, angle: angle, len: len });
        }

        // Shed particles (old form peeling away)
        this._shedParts = [];
        var shedGeo = new THREE.PlaneGeometry(0.02, 0.02);
        for (var j = 0; j < 30; j++) {
            var shColors = [0x888888, 0x999999, 0x777777, 0xaaaaaa, 0x666666];
            var shMat = new THREE.MeshBasicMaterial({
                color: shColors[j % shColors.length], transparent: true, opacity: 0,
                depthWrite: false, side: THREE.DoubleSide
            });
            var sh = new THREE.Mesh(shedGeo, shMat);
            sh.visible = false;
            scene.add(sh);
            this._shedParts.push({ mesh: sh, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0 });
        }
        this._shedIdx = 0;

        // Golden materialization particles
        this._goldParts = [];
        var goldGeo = new THREE.SphereGeometry(0.015, 4, 4);
        for (var k = 0; k < 25; k++) {
            var gColors = [0xffdd44, 0xffcc22, 0xffee66, 0xeebb00, 0xffdd88];
            var gMat = new THREE.MeshBasicMaterial({
                color: gColors[k % gColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var gp = new THREE.Mesh(goldGeo, gMat);
            gp.visible = false;
            scene.add(gp);
            this._goldParts.push({ mesh: gp, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
        }
        this._goldIdx = 0;

        // Halo ring
        var haloGeo = new THREE.TorusGeometry(0.12, 0.015, 8, 32);
        var haloMat = new THREE.MeshBasicMaterial({
            color: 0xffee88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._halo = new THREE.Mesh(haloGeo, haloMat);
        this._halo.position.set(ox, oy + 0.25, 0);
        this._halo.rotation.x = 0.8;
        scene.add(this._halo);

        // Radiant burst (large expanding sphere)
        var burstGeo = new THREE.SphereGeometry(0.3, 16, 16);
        var burstMat = new THREE.MeshBasicMaterial({
            color: 0xffeecc, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._burst = new THREE.Mesh(burstGeo, burstMat);
        this._burst.position.set(ox, oy, 0);
        scene.add(this._burst);

        this._lastShed = 0;
        this._lastGold = 0;
    },
    _emitShed(x, y) {
        for (var i = 0; i < 3; i++) {
            var s = this._shedParts[this._shedIdx % this._shedParts.length];
            this._shedIdx++;
            s.mesh.visible = true;
            s.mesh.position.set(x + (Math.random() - 0.5) * 0.12, y + (Math.random() - 0.5) * 0.12, 0.05);
            var a = Math.random() * Math.PI * 2;
            var spd = 0.5 + Math.random() * 1.0;
            s.vx = Math.cos(a) * spd;
            s.vy = Math.sin(a) * spd;
            s.vz = (Math.random() - 0.5) * 0.5;
            s.rx = (Math.random() - 0.5) * 8;
            s.ry = (Math.random() - 0.5) * 8;
            s.life = 0.8 + Math.random() * 0.5;
            s.maxLife = s.life;
            s.mesh.material.opacity = 0.6;
        }
    },
    _emitGold(x, y) {
        for (var i = 0; i < 4; i++) {
            var g = this._goldParts[this._goldIdx % this._goldParts.length];
            this._goldIdx++;
            g.mesh.visible = true;
            var a = Math.random() * Math.PI * 2;
            var r = 0.2 + Math.random() * 0.2;
            g.mesh.position.set(x + Math.cos(a) * r, y + Math.sin(a) * r, 0);
            // Converge inward
            g.vx = -Math.cos(a) * (1.0 + Math.random() * 1.5);
            g.vy = -Math.sin(a) * (1.0 + Math.random() * 1.5);
            g.vz = (Math.random() - 0.5) * 0.5;
            g.life = 0.4 + Math.random() * 0.3;
            g.maxLife = g.life;
            g.mesh.material.opacity = 0.9;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;

        if (progress < 0.10) {
            // Phase 1: Model begins to glow from within
            var t = progress / 0.10;
            this._innerLight.material.opacity = t * 0.3;
            this._innerLight.scale.setScalar(0.5 + t * 0.5);
            model.position.set(ox, oy, orig.z);
        } else if (progress < 0.25) {
            // Phase 2: Light radiates through cracks
            var t2 = (progress - 0.10) / 0.15;

            this._innerLight.material.opacity = 0.3 + t2 * 0.3;
            this._innerLight.scale.setScalar(1 + Math.sin(time * 4) * 0.1);

            for (var ci = 0; ci < this._cracks.length; ci++) {
                var crDelay = ci * 0.1;
                if (t2 > crDelay) {
                    this._cracks[ci].line.visible = true;
                    this._cracks[ci].line.material.opacity = Math.min(0.8, (t2 - crDelay) * 3);
                }
            }

            model.position.set(ox, oy, orig.z);
            model.rotation.z = Math.sin(time * 3) * 0.02;
        } else if (progress < 0.40) {
            // Phase 3: Levitation begins
            var t3 = (progress - 0.25) / 0.15;

            var liftY = t3 * 0.15;
            model.position.set(ox, oy + liftY, orig.z);
            model.rotation.z = Math.sin(time * 2) * 0.03;

            this._innerLight.position.set(ox, oy + liftY, 0.05);
            this._innerLight.material.opacity = 0.6 + Math.sin(time * 5) * 0.1;

            // Cracks pulse brighter
            for (var cj = 0; cj < this._cracks.length; cj++) {
                this._cracks[cj].line.material.opacity = 0.6 + Math.sin(time * 4 + cj) * 0.2;
            }
        } else if (progress < 0.55) {
            // Phase 4: Old form sheds as particles
            var t4 = (progress - 0.40) / 0.15;

            model.position.set(ox, oy + 0.15, orig.z);
            model.rotation.z = Math.sin(time * 2) * 0.03;

            // Shed old form
            if (time - this._lastShed > 0.06) {
                this._emitShed(ox, oy + 0.15);
                this._lastShed = time;
            }

            // Inner light intensifies
            this._innerLight.position.set(ox, oy + 0.15, 0.05);
            this._innerLight.material.opacity = 0.7 + t4 * 0.2;
            this._innerLight.material.color.setHex(0xffee88);

            // Cracks widen (brighten more)
            for (var ck = 0; ck < this._cracks.length; ck++) {
                this._cracks[ck].line.material.opacity = 0.8 + Math.sin(time * 5 + ck) * 0.15;
            }
        } else if (progress < 0.70) {
            // Phase 5: New form materializes (golden)
            var t5 = (progress - 0.55) / 0.15;

            model.position.set(ox, oy + 0.15, orig.z);

            // Gold particles converge
            if (time - this._lastGold > 0.05) {
                this._emitGold(ox, oy + 0.15);
                this._lastGold = time;
            }

            // Color shift - model "turns golden" via scale pulse
            model.scale.set(
                this._origScale.x * (1 + Math.sin(time * 6) * 0.03),
                this._origScale.y * (1 + Math.cos(time * 6) * 0.03),
                this._origScale.z
            );

            // Cracks fade as transformation completes
            for (var cl = 0; cl < this._cracks.length; cl++) {
                this._cracks[cl].line.material.opacity = 0.8 * (1 - t5);
            }

            this._innerLight.material.opacity = 0.9 - t5 * 0.3;
            this._innerLight.material.color.setHex(0xffdd44);
        } else if (progress < 0.82) {
            // Phase 6: Halo appears, radiant burst
            var t6 = (progress - 0.70) / 0.12;

            model.position.set(ox, oy + 0.15, orig.z);
            model.scale.copy(this._origScale);

            // Halo ring materializes
            this._halo.position.set(ox, oy + 0.35, 0);
            this._halo.material.opacity = t6 * 0.7;
            this._halo.rotation.z = time * 0.5;

            // Radiant burst
            var burstPeak = Math.sin(t6 * Math.PI);
            this._burst.material.opacity = burstPeak * 0.25;
            this._burst.scale.setScalar(1 + t6 * 2);

            this._innerLight.material.opacity = 0.6;
        } else {
            // Phase 7: Settle, fade
            var t7 = (progress - 0.82) / 0.18;

            model.position.set(ox, oy + 0.15 * (1 - t7), orig.z);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            this._halo.material.opacity = 0.7 * (1 - t7);
            this._halo.position.set(ox, oy + 0.35 - t7 * 0.1, 0);
            this._burst.material.opacity = 0;
            this._innerLight.material.opacity = 0.6 * (1 - t7);

            for (var cm = 0; cm < this._cracks.length; cm++) {
                this._cracks[cm].line.visible = false;
            }
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
            sp.mesh.rotation.x += sp.rx * delta;
            sp.mesh.rotation.y += sp.ry * delta;
            sp.mesh.material.opacity = 0.6 * (sp.life / sp.maxLife);
        }

        // Update gold particles
        for (var gi = 0; gi < this._goldParts.length; gi++) {
            var gp = this._goldParts[gi];
            if (gp.life <= 0) continue;
            gp.life -= delta;
            if (gp.life <= 0) { gp.mesh.visible = false; continue; }
            gp.mesh.position.x += gp.vx * delta;
            gp.mesh.position.y += gp.vy * delta;
            gp.mesh.position.z += gp.vz * delta;
            gp.mesh.material.opacity = 0.9 * (gp.life / gp.maxLife);
            gp.mesh.scale.setScalar(0.5 + 0.5 * (1 - gp.life / gp.maxLife));
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._innerLight) { scene.remove(this._innerLight); this._innerLight.geometry.dispose(); this._innerLight.material.dispose(); }
        if (this._cracks) {
            this._cracks.forEach(function(c) { scene.remove(c.line); c.line.geometry.dispose(); c.line.material.dispose(); });
        }
        if (this._shedParts) {
            this._shedParts.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
        }
        if (this._goldParts) {
            this._goldParts.forEach(function(g) { scene.remove(g.mesh); g.mesh.geometry.dispose(); g.mesh.material.dispose(); });
        }
        if (this._halo) { scene.remove(this._halo); this._halo.geometry.dispose(); this._halo.material.dispose(); }
        if (this._burst) { scene.remove(this._burst); this._burst.geometry.dispose(); this._burst.material.dispose(); }
        this._innerLight = this._cracks = this._shedParts = this._goldParts = this._halo = this._burst = null;
    }
};
