export default {
    name: 'Seasoning',
    label: 'seasoning',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Plate with food
        var plateGeo = new THREE.CylinderGeometry(0.25, 0.27, 0.02, 18);
        var plateMat = new THREE.MeshBasicMaterial({
            color: 0xdddddd, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._plate = new THREE.Mesh(plateGeo, plateMat);
        this._plate.position.set(ox - 0.2, oy - 0.25, 0);
        this._plate.rotation.x = Math.PI * 0.5;
        scene.add(this._plate);

        // Food mound
        var foodGeo = new THREE.SphereGeometry(0.1, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
        var foodMat = new THREE.MeshBasicMaterial({
            color: 0xbb8855, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._food = new THREE.Mesh(foodGeo, foodMat);
        this._food.rotation.x = Math.PI;
        this._food.position.set(ox - 0.2, oy - 0.22, 0);
        scene.add(this._food);

        // Seasoning particles (salt/pepper falling like snow)
        this._seasoning = [];
        var seaGeo = new THREE.SphereGeometry(0.005, 4, 4);
        for (var i = 0; i < 40; i++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0x222222 : (i % 3 === 1 ? 0xffffff : 0xddcc88),
                transparent: true, opacity: 0
            });
            var sMesh = new THREE.Mesh(seaGeo, sMat);
            sMesh.visible = false;
            scene.add(sMesh);
            this._seasoning.push({
                mesh: sMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, landed: false,
                finalX: 0, finalY: 0
            });
        }
        this._seaIdx = 0;

        // Flavor aura glow (changes color with each addition)
        var auraGeo = new THREE.SphereGeometry(0.18, 10, 10);
        var auraMat = new THREE.MeshBasicMaterial({
            color: 0xffeecc, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._aura = new THREE.Mesh(auraGeo, auraMat);
        this._aura.position.set(ox - 0.2, oy - 0.2, 0);
        scene.add(this._aura);

        // Golden perfection glow
        var goldGeo = new THREE.SphereGeometry(0.3, 12, 12);
        var goldMat = new THREE.MeshBasicMaterial({
            color: 0xffdd44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._goldGlow = new THREE.Mesh(goldGeo, goldMat);
        this._goldGlow.position.set(ox - 0.2, oy - 0.2, 0);
        scene.add(this._goldGlow);

        // Shaker (small cylinder in model's hand area)
        var shakerGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.08, 8);
        var shakerMat = new THREE.MeshBasicMaterial({
            color: 0x888888, transparent: true, opacity: 0
        });
        this._shaker = new THREE.Mesh(shakerGeo, shakerMat);
        this._shaker.position.set(ox - 0.2, oy + 0.1, 0);
        scene.add(this._shaker);

        this._seasonPhase = 0;
    },
    _spawnSeasoning(x, y) {
        for (var i = 0; i < 4; i++) {
            var s = this._seasoning[this._seaIdx % this._seasoning.length];
            this._seaIdx++;
            s.mesh.visible = true;
            s.mesh.position.set(
                x + (Math.random() - 0.5) * 0.1,
                y,
                (Math.random() - 0.5) * 0.05
            );
            s.vx = (Math.random() - 0.5) * 0.08;
            s.vy = -0.3 - Math.random() * 0.2;
            s.life = 0.8 + Math.random() * 0.4;
            s.maxLife = s.life;
            s.landed = false;
            s.finalX = x + (Math.random() - 0.5) * 0.15;
            s.finalY = y - 0.18 + Math.random() * 0.05;
            s.mesh.material.opacity = 0.8;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        var foodX = ox - 0.2;
        var foodY = oy - 0.22;

        if (progress < 0.08) {
            // Phase 1: Plate and food appear
            var t = progress / 0.08;
            var ease = t * t;
            this._plate.material.opacity = ease * 0.7;
            this._food.material.opacity = ease * 0.8;
            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.30) {
            // Phase 2: First seasoning shake
            var t2 = (progress - 0.08) / 0.22;
            this._plate.material.opacity = 0.7;
            this._food.material.opacity = 0.8;

            // Shaker appears and shakes
            this._shaker.material.opacity = 0.7;
            var shakeX = foodX + Math.sin(time * 12) * 0.03;
            var shakeY = oy + 0.08 + Math.abs(Math.sin(time * 8)) * 0.02;
            this._shaker.position.set(shakeX, shakeY, 0);
            this._shaker.rotation.z = Math.sin(time * 10) * 0.15;

            // Seasoning falls
            if (Math.random() < 0.1 + t2 * 0.1) {
                this._spawnSeasoning(shakeX, shakeY - 0.04);
            }

            // Aura starts
            this._aura.material.opacity = t2 * 0.1;
            this._aura.material.color.setHex(0xffeecc);

            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.42) {
            // Phase 3: Taste test - model moves close
            var t3 = (progress - 0.30) / 0.12;
            this._shaker.material.opacity = 0.7 * (1 - t3);

            // Model approaches food
            model.position.set(ox + 0.15 - t3 * 0.15, oy - t3 * 0.05, oz);
            model.rotation.z = -t3 * 0.04;

            this._aura.material.opacity = 0.1;
        } else if (progress < 0.60) {
            // Phase 4: More seasoning after taste test
            var t4 = (progress - 0.42) / 0.18;

            // Model returns
            model.position.set(ox + 0.15 * t4, oy - 0.05 * (1 - t4), oz);
            model.rotation.z = -0.04 * (1 - t4);

            // Shaker returns with more vigorous shaking
            this._shaker.material.opacity = t4 * 0.7;
            var shakeX2 = foodX + Math.sin(time * 15) * 0.04;
            var shakeY2 = oy + 0.08 + Math.abs(Math.sin(time * 10)) * 0.025;
            this._shaker.position.set(shakeX2, shakeY2, 0);
            this._shaker.rotation.z = Math.sin(time * 12) * 0.2;

            // More seasoning
            if (t4 > 0.3 && Math.random() < 0.15) {
                this._spawnSeasoning(shakeX2, shakeY2 - 0.04);
            }

            // Aura color shifts
            this._aura.material.opacity = 0.1 + t4 * 0.1;
            this._aura.material.color.setRGB(
                1.0,
                0.85 + t4 * 0.05,
                0.7 - t4 * 0.1
            );
        } else if (progress < 0.78) {
            // Phase 5: Each addition changes flavor aura
            var t5 = (progress - 0.60) / 0.18;

            this._shaker.material.opacity = 0.7;
            var shakeX3 = foodX + Math.sin(time * 14) * 0.035;
            var shakeY3 = oy + 0.08;
            this._shaker.position.set(shakeX3, shakeY3, 0);
            this._shaker.rotation.z = Math.sin(time * 11) * 0.18;

            // Final seasoning bursts
            if (Math.random() < 0.1) {
                this._spawnSeasoning(shakeX3, shakeY3 - 0.04);
            }

            // Aura transitions through colors
            var colorPhase = t5 * Math.PI;
            this._aura.material.opacity = 0.2 + Math.sin(colorPhase) * 0.1;
            this._aura.material.color.setRGB(
                0.9 + Math.sin(colorPhase) * 0.1,
                0.7 + Math.sin(colorPhase + 1) * 0.15,
                0.5 + Math.sin(colorPhase + 2) * 0.2
            );

            model.position.set(ox + 0.15, oy, oz);
            model.rotation.z = 0;
        } else if (progress < 0.90) {
            // Phase 6: Perfect balance achieved - golden glow
            var t6 = (progress - 0.78) / 0.12;
            this._shaker.material.opacity = 0.7 * (1 - t6);

            // Golden perfection glow
            this._goldGlow.material.opacity = t6 * 0.3;
            this._goldGlow.scale.setScalar(1 + Math.sin(time * 3) * 0.1);

            // Aura settles to warm gold
            this._aura.material.opacity = 0.2 + t6 * 0.1;
            this._aura.material.color.setHex(0xffdd66);

            model.position.set(ox + 0.15, oy, oz);
        } else {
            // Phase 7: Fade out
            var t7 = (progress - 0.90) / 0.10;
            this._plate.material.opacity = 0.7 * (1 - t7);
            this._food.material.opacity = 0.8 * (1 - t7);
            this._aura.material.opacity = 0.3 * (1 - t7);
            this._goldGlow.material.opacity = 0.3 * (1 - t7);
            this._shaker.material.opacity = 0;

            model.position.set(ox + 0.15 * (1 - t7), oy, oz);
            model.scale.copy(this._origScale);
        }

        // Update seasoning particles
        for (var si = 0; si < this._seasoning.length; si++) {
            var sp = this._seasoning[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            if (!sp.landed) {
                sp.mesh.position.x += sp.vx * delta;
                sp.mesh.position.y += sp.vy * delta;
                // Slight drift
                sp.mesh.position.x += Math.sin(time * 6 + si) * 0.001;
                if (sp.mesh.position.y <= sp.finalY) {
                    sp.landed = true;
                    sp.mesh.position.set(sp.finalX, sp.finalY, 0);
                }
            }
            var lr = sp.life / sp.maxLife;
            sp.mesh.material.opacity = sp.landed ? Math.min(0.8, lr * 2) : 0.8;
            sp.mesh.scale.setScalar(0.8);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._plate) { scene.remove(this._plate); this._plate.geometry.dispose(); this._plate.material.dispose(); }
        if (this._food) { scene.remove(this._food); this._food.geometry.dispose(); this._food.material.dispose(); }
        if (this._aura) { scene.remove(this._aura); this._aura.geometry.dispose(); this._aura.material.dispose(); }
        if (this._goldGlow) { scene.remove(this._goldGlow); this._goldGlow.geometry.dispose(); this._goldGlow.material.dispose(); }
        if (this._shaker) { scene.remove(this._shaker); this._shaker.geometry.dispose(); this._shaker.material.dispose(); }
        if (this._seasoning) { this._seasoning.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        this._plate = this._food = this._aura = this._goldGlow = this._shaker = this._seasoning = null;
    }
};
