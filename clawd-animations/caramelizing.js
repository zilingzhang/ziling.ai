export default {
    name: 'Caramelizing',
    label: 'caramelizing',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Flat pan disc
        var panGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.03, 20);
        var panMat = new THREE.MeshBasicMaterial({
            color: 0x666666, transparent: true, opacity: 0
        });
        this._pan = new THREE.Mesh(panGeo, panMat);
        this._pan.position.set(ox - 0.25, oy - 0.22, 0);
        this._pan.rotation.x = Math.PI * 0.5;
        scene.add(this._pan);

        // Pan handle
        var handleGeo = new THREE.BoxGeometry(0.25, 0.025, 0.04);
        var handleMat = new THREE.MeshBasicMaterial({
            color: 0x555555, transparent: true, opacity: 0
        });
        this._handle = new THREE.Mesh(handleGeo, handleMat);
        this._handle.position.set(ox - 0.25 + 0.38, oy - 0.22, 0);
        scene.add(this._handle);

        // Sugar crystals (small white boxes)
        this._crystals = [];
        var crystalGeo = new THREE.BoxGeometry(0.035, 0.035, 0.035);
        for (var i = 0; i < 12; i++) {
            var cMat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0
            });
            var crystal = new THREE.Mesh(crystalGeo, cMat);
            var angle = (i / 12) * Math.PI * 2;
            var dist = 0.08 + Math.random() * 0.12;
            crystal.position.set(
                ox - 0.25 + Math.cos(angle) * dist,
                oy - 0.20,
                Math.sin(angle) * dist * 0.3
            );
            crystal.rotation.set(
                Math.random() * 0.5,
                Math.random() * 0.5,
                Math.random() * 0.5
            );
            crystal.userData.origY = crystal.position.y;
            crystal.userData.origScaleY = 1.0;
            scene.add(crystal);
            this._crystals.push(crystal);
        }

        // Liquid pool (flat cylinder that grows, color animates)
        var poolGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.01, 16);
        var poolMat = new THREE.MeshBasicMaterial({
            color: 0xffd700, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._pool = new THREE.Mesh(poolGeo, poolMat);
        this._pool.position.set(ox - 0.25, oy - 0.21, 0);
        this._pool.rotation.x = Math.PI * 0.5;
        scene.add(this._pool);

        // Heat shimmer particles
        this._shimmer = [];
        var shimGeo = new THREE.SphereGeometry(0.015, 4, 4);
        for (var h = 0; h < 15; h++) {
            var hMat = new THREE.MeshBasicMaterial({
                color: 0xff6600, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var hMesh = new THREE.Mesh(shimGeo, hMat);
            hMesh.visible = false;
            scene.add(hMesh);
            this._shimmer.push({
                mesh: hMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, baseX: 0
            });
        }
        this._shimIdx = 0;

        // Smoke particles
        this._smoke = [];
        var smokeGeo = new THREE.SphereGeometry(0.03, 6, 6);
        for (var s = 0; s < 10; s++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: 0x888888, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sMesh = new THREE.Mesh(smokeGeo, sMat);
            sMesh.visible = false;
            scene.add(sMesh);
            this._smoke.push({
                mesh: sMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._smokeIdx = 0;

        // Caramel gloss glow
        var glossGeo = new THREE.CircleGeometry(0.2, 16);
        var glossMat = new THREE.MeshBasicMaterial({
            color: 0xcc8800, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._gloss = new THREE.Mesh(glossGeo, glossMat);
        this._gloss.position.set(ox - 0.25, oy - 0.19, 0);
        scene.add(this._gloss);
    },
    _emitShimmer(x, y, time) {
        var s = this._shimmer[this._shimIdx % this._shimmer.length];
        this._shimIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x + (Math.random() - 0.5) * 0.35, y, 0);
        s.baseX = s.mesh.position.x;
        s.vx = 0;
        s.vy = 0.5 + Math.random() * 0.3;
        s.life = 0.3 + Math.random() * 0.3;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.4;
    },
    _emitSmoke(x, y) {
        var s = this._smoke[this._smokeIdx % this._smoke.length];
        this._smokeIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x + (Math.random() - 0.5) * 0.15, y, 0);
        s.vx = (Math.random() - 0.5) * 0.15;
        s.vy = 0.3 + Math.random() * 0.2;
        s.life = 0.8 + Math.random() * 0.5;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.3;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        var panX = ox - 0.25;
        var panY = oy - 0.20;

        if (progress < 0.12) {
            // Phase 1: Pan appears, crystals placed
            var t = progress / 0.12;
            var ease = t * t;
            this._pan.material.opacity = ease * 0.6;
            this._handle.material.opacity = ease * 0.5;
            for (var i = 0; i < this._crystals.length; i++) {
                this._crystals[i].material.opacity = ease * 0.8;
            }
            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.40) {
            // Phase 2: Heat starts, crystals begin melting downward
            var t2 = (progress - 0.12) / 0.28;
            this._pan.material.opacity = 0.6;
            this._handle.material.opacity = 0.5;

            // Crystals melt: shrink vertically, become translucent
            for (var j = 0; j < this._crystals.length; j++) {
                var c = this._crystals[j];
                var meltDelay = j / this._crystals.length * 0.4;
                var meltProgress = Math.max(0, Math.min((t2 - meltDelay) / 0.6, 1));
                c.scale.y = 1 - meltProgress * 0.7;
                c.position.y = c.userData.origY - meltProgress * 0.015;
                c.material.opacity = 0.8 - meltProgress * 0.3;
                // Color shifts from white to light gold
                var r = 1.0;
                var g = 1.0 - meltProgress * 0.2;
                var b2 = 1.0 - meltProgress * 0.6;
                c.material.color.setRGB(r, g, b2);
            }

            // Liquid pool starts forming
            var poolSize = t2 * 0.15;
            this._pool.scale.set(poolSize * 15, 1, poolSize * 15);
            this._pool.material.opacity = t2 * 0.4;

            // Heat shimmer
            if (Math.random() < 0.08 + t2 * 0.05) {
                this._emitShimmer(panX, panY + 0.02, time);
            }

            // Pan glows warm
            this._pan.material.color.setRGB(0.4 + t2 * 0.3, 0.4 + t2 * 0.1, 0.4 - t2 * 0.1);

            model.position.set(ox + 0.15, oy + Math.sin(time * 2) * 0.01, oz);
        } else if (progress < 0.70) {
            // Phase 3: Liquid pool spreads, color darkens to amber
            var t3 = (progress - 0.40) / 0.30;

            // Crystals mostly melted
            for (var k = 0; k < this._crystals.length; k++) {
                var cc = this._crystals[k];
                cc.scale.y = 0.3 - t3 * 0.25;
                cc.material.opacity = 0.5 * (1 - t3);
                cc.material.color.setRGB(0.9, 0.7 - t3 * 0.2, 0.3 - t3 * 0.2);
            }

            // Pool expands and darkens
            var poolGrow = 0.15 + t3 * 0.1;
            this._pool.scale.set(poolGrow * 15, 1, poolGrow * 15);
            this._pool.material.opacity = 0.4 + t3 * 0.3;

            // Color from gold to deep amber
            var pr = 0.8 - t3 * 0.15;
            var pg = 0.6 - t3 * 0.2;
            var pb = 0.0;
            this._pool.material.color.setRGB(pr, pg, pb);

            // More shimmer
            if (Math.random() < 0.12) {
                this._emitShimmer(panX, panY + 0.02, time);
            }

            // Sweet aroma hint - model sways appreciatively
            model.position.set(ox + 0.15, oy, oz);
            model.rotation.z = Math.sin(time * 2) * 0.04;

            // Pan gets hotter
            this._pan.material.color.setRGB(0.7 + Math.sin(time * 4) * 0.1, 0.5, 0.3);
        } else if (progress < 0.90) {
            // Phase 4: Caramel hardens with glossy glow, smoke rises
            var t4 = (progress - 0.70) / 0.20;

            // Crystals gone
            for (var m = 0; m < this._crystals.length; m++) {
                this._crystals[m].material.opacity = 0;
            }

            // Pool fully formed, glassy appearance
            this._pool.scale.set(3.5, 1, 3.5);
            this._pool.material.opacity = 0.7;
            this._pool.material.color.setRGB(0.65, 0.35, 0.05);

            // Glossy shine
            this._gloss.material.opacity = t4 * 0.3 * (0.8 + Math.sin(time * 6) * 0.2);

            // Smoke wisps
            if (Math.random() < 0.08 + t4 * 0.06) {
                this._emitSmoke(panX, panY + 0.03);
            }

            // Heat shimmer diminishes
            if (Math.random() < 0.04) {
                this._emitShimmer(panX, panY + 0.02, time);
            }

            model.position.set(ox + 0.15, oy, oz);
            model.rotation.z = 0;
        } else {
            // Phase 5: Fade out
            var t5 = (progress - 0.90) / 0.10;
            this._pan.material.opacity = 0.6 * (1 - t5);
            this._handle.material.opacity = 0.5 * (1 - t5);
            this._pool.material.opacity = 0.7 * (1 - t5);
            this._gloss.material.opacity = 0.3 * (1 - t5);

            model.position.set(ox + 0.15 * (1 - t5), oy, oz);
            model.scale.copy(this._origScale);
        }

        // Update heat shimmer
        for (var si = 0; si < this._shimmer.length; si++) {
            var sh = this._shimmer[si];
            if (sh.life <= 0) continue;
            sh.life -= delta;
            if (sh.life <= 0) { sh.mesh.visible = false; continue; }
            sh.mesh.position.y += sh.vy * delta;
            // Wavy horizontal motion
            sh.mesh.position.x = sh.baseX + Math.sin(time * 12 + si * 3) * 0.02;
            var lr = sh.life / sh.maxLife;
            sh.mesh.material.opacity = lr * 0.35;
            sh.mesh.scale.setScalar(0.5 + (1 - lr) * 0.5);
        }

        // Update smoke
        for (var ski = 0; ski < this._smoke.length; ski++) {
            var sk = this._smoke[ski];
            if (sk.life <= 0) continue;
            sk.life -= delta;
            if (sk.life <= 0) { sk.mesh.visible = false; continue; }
            sk.mesh.position.x += sk.vx * delta;
            sk.mesh.position.y += sk.vy * delta;
            var slr = sk.life / sk.maxLife;
            sk.mesh.material.opacity = slr * 0.25;
            sk.mesh.scale.setScalar(0.6 + (1 - slr) * 2.0);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._pan) { scene.remove(this._pan); this._pan.geometry.dispose(); this._pan.material.dispose(); }
        if (this._handle) { scene.remove(this._handle); this._handle.geometry.dispose(); this._handle.material.dispose(); }
        if (this._pool) { scene.remove(this._pool); this._pool.geometry.dispose(); this._pool.material.dispose(); }
        if (this._gloss) { scene.remove(this._gloss); this._gloss.geometry.dispose(); this._gloss.material.dispose(); }
        if (this._crystals) { this._crystals.forEach(function(c) { scene.remove(c); c.geometry.dispose(); c.material.dispose(); }); }
        if (this._shimmer) { this._shimmer.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._smoke) { this._smoke.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        this._pan = this._handle = this._pool = this._gloss = this._crystals = this._shimmer = this._smoke = null;
    }
};
