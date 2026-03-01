export default {
    name: 'Finagling',
    label: 'finagling',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Square peg (cube)
        var pegGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
        var pegMat = new THREE.MeshBasicMaterial({
            color: 0x888888, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._peg = new THREE.Mesh(pegGeo, pegMat);
        this._peg.position.set(ox - 0.4, oy + 0.1, 0);
        scene.add(this._peg);

        // Round hole (torus)
        var holeGeo = new THREE.TorusGeometry(0.1, 0.02, 8, 24);
        var holeMat = new THREE.MeshBasicMaterial({
            color: 0xccaa44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._hole = new THREE.Mesh(holeGeo, holeMat);
        this._hole.position.set(ox + 0.3, oy - 0.05, 0);
        scene.add(this._hole);

        // Sparks for shaving edges
        this._sparks = [];
        var spkGeo = new THREE.SphereGeometry(0.015, 4, 4);
        for (var i = 0; i < 40; i++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0xffcc44 : (i % 3 === 1 ? 0xff8800 : 0xffee66),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spk = new THREE.Mesh(spkGeo, sMat);
            spk.visible = false;
            scene.add(spk);
            this._sparks.push({ mesh: spk, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
        }
        this._spkIdx = 0;

        // Satisfaction burst particles
        this._burstParts = [];
        var burstGeo = new THREE.SphereGeometry(0.02, 6, 6);
        for (var j = 0; j < 30; j++) {
            var bColors = [0xffdd44, 0xffaa00, 0xffee88, 0xccaa33, 0xffe066];
            var bMat = new THREE.MeshBasicMaterial({
                color: bColors[j % bColors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var bp = new THREE.Mesh(burstGeo, bMat);
            bp.visible = false;
            scene.add(bp);
            this._burstParts.push({ mesh: bp, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
        }
        this._burstIdx = 0;

        // Glow ring for satisfaction
        var glowGeo = new THREE.TorusGeometry(0.2, 0.04, 8, 32);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xffdd44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._glowRing = new THREE.Mesh(glowGeo, glowMat);
        this._glowRing.position.set(ox + 0.3, oy - 0.05, 0);
        scene.add(this._glowRing);

        this._lastSpark = 0;
        this._fitDone = false;
    },
    _emitSparks(x, y) {
        for (var i = 0; i < 4; i++) {
            var s = this._sparks[this._spkIdx % this._sparks.length];
            this._spkIdx++;
            s.mesh.visible = true;
            s.mesh.position.set(x, y, 0);
            var a = Math.random() * Math.PI * 2;
            var spd = 1.5 + Math.random() * 2.5;
            s.vx = Math.cos(a) * spd;
            s.vy = Math.sin(a) * spd;
            s.vz = (Math.random() - 0.5) * 1.0;
            s.life = 0.25 + Math.random() * 0.3;
            s.maxLife = s.life;
            s.mesh.material.opacity = 1.0;
        }
    },
    _emitBurst(x, y) {
        for (var i = 0; i < 15; i++) {
            var b = this._burstParts[this._burstIdx % this._burstParts.length];
            this._burstIdx++;
            b.mesh.visible = true;
            b.mesh.position.set(x, y, 0);
            var a = Math.random() * Math.PI * 2;
            var spd = 2.0 + Math.random() * 3.0;
            b.vx = Math.cos(a) * spd;
            b.vy = Math.sin(a) * spd;
            b.vz = (Math.random() - 0.5) * 2.0;
            b.life = 0.5 + Math.random() * 0.5;
            b.maxLife = b.life;
            b.mesh.material.opacity = 1.0;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;
        var holeX = ox + 0.3;
        var holeY = oy - 0.05;

        if (progress < 0.08) {
            // Phase 1: Peg and hole appear
            var t = progress / 0.08;
            this._peg.material.opacity = t * 0.8;
            this._hole.material.opacity = t * 0.7;
            model.position.set(ox, oy, oz);
        } else if (progress < 0.22) {
            // Phase 2: Model pushes peg toward hole - first attempt
            var t2 = (progress - 0.08) / 0.14;
            this._peg.material.opacity = 0.8;
            this._hole.material.opacity = 0.7;

            var pegX = ox - 0.4 + t2 * 0.5;
            this._peg.position.set(pegX, oy + 0.1, 0);
            model.position.set(pegX - 0.2, oy, oz);
            model.rotation.z = -0.1;

            // Push lean
            model.scale.set(this._origScale.x * (1 + t2 * 0.05), this._origScale.y * (1 - t2 * 0.03), this._origScale.z);
        } else if (progress < 0.32) {
            // Phase 3: Doesn't fit! Bounce back
            var t3 = (progress - 0.22) / 0.10;
            var bounce = Math.sin(t3 * Math.PI) * 0.15;

            this._peg.position.set(ox + 0.1 - t3 * 0.15, oy + 0.1 + bounce, 0);
            model.position.set(ox - 0.1, oy + bounce * 0.5, oz);
            model.rotation.z = Math.sin(t3 * Math.PI * 3) * 0.08;
            model.scale.copy(this._origScale);

            // Rejection flash on hole
            this._hole.material.color.setHex(0xff4444);
            this._hole.material.opacity = 0.7 + Math.sin(t3 * Math.PI * 4) * 0.3;
        } else if (progress < 0.42) {
            // Phase 4: Wiggle and tilt attempts
            var t4 = (progress - 0.32) / 0.10;
            this._hole.material.color.setHex(0xccaa44);
            this._hole.material.opacity = 0.7;

            var wiggle = Math.sin(t4 * Math.PI * 6) * 0.06;
            var tilt = Math.sin(t4 * Math.PI * 4) * 0.3;
            this._peg.position.set(holeX - 0.05, holeY + 0.15 + wiggle, 0);
            this._peg.rotation.z = tilt;

            model.position.set(holeX - 0.25, oy + Math.sin(time * 4) * 0.02, oz);
            model.rotation.z = Math.sin(time * 3) * 0.05;
        } else if (progress < 0.65) {
            // Phase 5: Shaving edges! Sparks fly as peg is reshaped
            var t5 = (progress - 0.42) / 0.23;

            // Peg slowly morphs (scale corners away)
            var roundness = t5;
            this._peg.scale.set(1 - roundness * 0.2, 1 - roundness * 0.2, 1 - roundness * 0.2);
            this._peg.rotation.z = time * 2;
            this._peg.rotation.y = time * 1.5;
            this._peg.position.set(holeX, holeY + 0.18, 0);

            // Color shifts from gray to gold as it transforms
            var r = 0.53 + roundness * 0.47;
            var g = 0.53 + roundness * 0.27;
            var b = 0.53 - roundness * 0.27;
            this._peg.material.color.setRGB(r, g, b);

            model.position.set(holeX - 0.22, oy + Math.sin(time * 5) * 0.02, oz);
            model.rotation.z = -0.05 + Math.sin(time * 6) * 0.03;

            // Sparks during shaving
            if (time - this._lastSpark > 0.06) {
                this._emitSparks(holeX, holeY + 0.18);
                this._lastSpark = time;
            }
        } else if (progress < 0.78) {
            // Phase 6: Almost... almost... trying to push reshaped peg in
            var t6 = (progress - 0.65) / 0.13;

            var pushY = holeY + 0.18 - t6 * 0.15;
            var wobble = Math.sin(t6 * Math.PI * 8) * 0.02 * (1 - t6);
            this._peg.position.set(holeX + wobble, pushY, 0);
            this._peg.rotation.z = wobble * 3;
            this._peg.scale.setScalar(0.8);
            this._peg.material.color.setHex(0xddaa33);

            model.position.set(holeX - 0.2, oy - t6 * 0.03, oz);
            model.rotation.z = -0.08;
            model.scale.set(this._origScale.x * (1 + t6 * 0.05), this._origScale.y * (1 - t6 * 0.03), this._origScale.z);

            // Strain vibration
            this._hole.material.opacity = 0.7 + Math.sin(time * 12) * 0.2;
        } else if (progress < 0.85) {
            // Phase 7: POP it fits! Satisfaction burst!
            var t7 = (progress - 0.78) / 0.07;

            if (!this._fitDone) {
                this._emitBurst(holeX, holeY);
                this._fitDone = true;
            }

            // Peg snaps into hole
            this._peg.position.set(holeX, holeY, 0);
            this._peg.rotation.z = 0;
            this._peg.scale.setScalar(0.75);
            this._peg.material.color.setHex(0xffdd44);
            this._peg.material.opacity = 0.9;

            // Hole flashes gold
            this._hole.material.color.setHex(0xffdd44);
            this._hole.material.opacity = 0.9;

            // Glow ring expands
            this._glowRing.material.opacity = (1 - t7) * 0.6;
            this._glowRing.scale.setScalar(1 + t7 * 3);

            // Model celebration bounce
            model.position.set(ox, oy + Math.sin(t7 * Math.PI) * 0.15, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        } else {
            // Phase 8: Satisfaction glow fade
            var t8 = (progress - 0.85) / 0.15;

            this._peg.material.opacity = 0.9 * (1 - t8);
            this._hole.material.opacity = 0.7 * (1 - t8);
            this._glowRing.material.opacity = 0;

            model.position.set(ox, oy, oz);
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
            sp.mesh.position.z += sp.vz * delta;
            sp.vy -= 3 * delta;
            sp.mesh.material.opacity = sp.life / sp.maxLife;
            sp.mesh.scale.setScalar(0.3 + 0.7 * (sp.life / sp.maxLife));
        }

        // Update burst particles
        for (var bi = 0; bi < this._burstParts.length; bi++) {
            var bp = this._burstParts[bi];
            if (bp.life <= 0) continue;
            bp.life -= delta;
            if (bp.life <= 0) { bp.mesh.visible = false; continue; }
            bp.mesh.position.x += bp.vx * delta;
            bp.mesh.position.y += bp.vy * delta;
            bp.mesh.position.z += bp.vz * delta;
            bp.vy -= 2 * delta;
            bp.mesh.material.opacity = bp.life / bp.maxLife;
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._peg) { scene.remove(this._peg); this._peg.geometry.dispose(); this._peg.material.dispose(); }
        if (this._hole) { scene.remove(this._hole); this._hole.geometry.dispose(); this._hole.material.dispose(); }
        if (this._glowRing) { scene.remove(this._glowRing); this._glowRing.geometry.dispose(); this._glowRing.material.dispose(); }
        if (this._sparks) {
            this._sparks.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
        }
        if (this._burstParts) {
            this._burstParts.forEach(function(b) { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); });
        }
        this._peg = this._hole = this._glowRing = this._sparks = this._burstParts = null;
    }
};
