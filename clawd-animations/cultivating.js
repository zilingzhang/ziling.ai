export default {
    name: 'Cultivating',
    label: 'cultivating',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Garden bed (brown rectangle)
        var bedGeo = new THREE.BoxGeometry(1.2, 0.08, 0.3);
        var bedMat = new THREE.MeshBasicMaterial({
            color: 0x664422, transparent: true, opacity: 0
        });
        this._bed = new THREE.Mesh(bedGeo, bedMat);
        this._bed.position.set(ox, oy - 0.35, -0.05);
        scene.add(this._bed);

        // Soil furrow lines
        this._furrows = [];
        for (var f = 0; f < 6; f++) {
            var fGeo = new THREE.BoxGeometry(0.15, 0.03, 0.25);
            var fMat = new THREE.MeshBasicMaterial({
                color: 0x553311, transparent: true, opacity: 0
            });
            var furrow = new THREE.Mesh(fGeo, fMat);
            furrow.position.set(ox - 0.5 + f * 0.2, oy - 0.35, 0);
            scene.add(furrow);
            this._furrows.push({ mesh: furrow, tilled: false });
        }

        // Seeds (brown dots)
        this._seeds = [];
        var seedGeo = new THREE.SphereGeometry(0.015, 5, 5);
        for (var s = 0; s < 6; s++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: 0x885533, transparent: true, opacity: 0
            });
            var seed = new THREE.Mesh(seedGeo, sMat);
            seed.position.set(ox - 0.5 + s * 0.2, oy - 0.25, 0);
            seed.visible = false;
            scene.add(seed);
            this._seeds.push({ mesh: seed, planted: false, dropY: oy + 0.1 });
        }

        // Water particles
        this._waterDrops = [];
        var wGeo = new THREE.SphereGeometry(0.01, 4, 4);
        for (var w = 0; w < 30; w++) {
            var wMat = new THREE.MeshBasicMaterial({
                color: 0x4488cc, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var drop = new THREE.Mesh(wGeo, wMat);
            drop.visible = false;
            scene.add(drop);
            this._waterDrops.push({
                mesh: drop, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._waterIdx = 0;

        // Plant shoots
        this._plants = [];
        for (var pl = 0; pl < 6; pl++) {
            // Stem (thin green box)
            var stemGeo = new THREE.BoxGeometry(0.015, 0.0, 0.01);
            var stemMat = new THREE.MeshBasicMaterial({
                color: 0x33aa33, transparent: true, opacity: 0
            });
            var stem = new THREE.Mesh(stemGeo, stemMat);
            stem.position.set(ox - 0.5 + pl * 0.2, oy - 0.32, 0);
            scene.add(stem);

            // Leaf pair (two small flat discs)
            var leafGeo = new THREE.CircleGeometry(0.025, 6);
            var leafMat1 = new THREE.MeshBasicMaterial({
                color: 0x44cc44, transparent: true, opacity: 0,
                side: THREE.DoubleSide
            });
            var leafMat2 = new THREE.MeshBasicMaterial({
                color: 0x44cc44, transparent: true, opacity: 0,
                side: THREE.DoubleSide
            });
            var leaf1 = new THREE.Mesh(leafGeo, leafMat1);
            var leaf2 = new THREE.Mesh(leafGeo, leafMat2);
            leaf1.visible = false;
            leaf2.visible = false;
            scene.add(leaf1);
            scene.add(leaf2);

            this._plants.push({
                stem: stem, leaf1: leaf1, leaf2: leaf2,
                height: 0, maxHeight: 0.12 + Math.random() * 0.08,
                growing: false
            });
        }

        // Harvest glow
        var glowGeo = new THREE.SphereGeometry(0.6, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0x88cc44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._harvestGlow = new THREE.Mesh(glowGeo, glowMat);
        this._harvestGlow.position.set(ox, oy - 0.2, 0);
        scene.add(this._harvestGlow);
    },
    _spawnWater(x, y) {
        var w = this._waterDrops[this._waterIdx % this._waterDrops.length];
        this._waterIdx++;
        w.mesh.visible = true;
        w.mesh.position.set(x + (Math.random() - 0.5) * 0.15, y + 0.15, 0);
        w.vx = (Math.random() - 0.5) * 0.1;
        w.vy = -0.3 - Math.random() * 0.2;
        w.life = 0.4 + Math.random() * 0.3;
        w.maxLife = w.life;
        w.mesh.material.opacity = 0.6;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        // Phase 1: Garden bed appears (0-8%)
        if (progress < 0.08) {
            var t = progress / 0.08;
            this._bed.material.opacity = t * 0.7;
            this._bed.scale.set(t, 1, 1);
            model.position.set(ox + 0.2, oy, oz);
        }
        // Phase 2: Tilling soil (8-25%)
        else if (progress < 0.25) {
            var t2 = (progress - 0.08) / 0.17;
            this._bed.material.opacity = 0.7;
            // Model moves back and forth tilling
            var tillX = ox - 0.5 + t2 * 1.0;
            var tillBob = Math.sin(time * 12) * 0.015;
            model.position.set(tillX, oy + tillBob, oz);
            model.rotation.z = Math.sin(time * 8) * 0.05;

            // Furrows appear as model passes
            for (var f = 0; f < this._furrows.length; f++) {
                var furrowProgress = (f / this._furrows.length);
                if (t2 > furrowProgress) {
                    this._furrows[f].mesh.material.opacity = Math.min((t2 - furrowProgress) * 4, 0.6);
                    this._furrows[f].tilled = true;
                }
            }
        }
        // Phase 3: Dropping seeds (25-38%)
        else if (progress < 0.38) {
            var t3 = (progress - 0.25) / 0.13;
            model.position.set(ox - 0.5 + t3 * 1.0, oy + 0.05, oz);
            model.rotation.z = 0;

            for (var s = 0; s < this._seeds.length; s++) {
                var seedT = (s / this._seeds.length);
                if (t3 > seedT) {
                    var sd = this._seeds[s];
                    sd.mesh.visible = true;
                    var dropProgress = Math.min((t3 - seedT) * 6, 1);
                    sd.mesh.position.y = sd.dropY + (oy - 0.33 - sd.dropY) * dropProgress;
                    sd.mesh.material.opacity = 0.8;
                    sd.planted = dropProgress >= 1;
                }
            }
        }
        // Phase 4: Watering (38-52%)
        else if (progress < 0.52) {
            var t4 = (progress - 0.38) / 0.14;
            model.position.set(ox - 0.5 + t4 * 1.0, oy + 0.1, oz);

            // Spawn water droplets
            if (Math.random() < 0.3) {
                var waterX = ox - 0.5 + t4 * 1.0;
                this._spawnWater(waterX, oy - 0.2);
            }

            // Seeds sink into soil
            for (var s2 = 0; s2 < this._seeds.length; s2++) {
                this._seeds[s2].mesh.material.opacity = 0.8 * (1 - t4 * 0.5);
            }
        }
        // Phase 5: Green shoots emerge (52-72%)
        else if (progress < 0.72) {
            var t5 = (progress - 0.52) / 0.20;
            model.position.set(ox + 0.3, oy, oz);
            model.rotation.z = 0;

            // Hide seeds
            for (var s3 = 0; s3 < this._seeds.length; s3++) {
                this._seeds[s3].mesh.visible = false;
            }

            // Grow plants
            for (var pl = 0; pl < this._plants.length; pl++) {
                var plant = this._plants[pl];
                var plantDelay = pl * 0.12;
                var growT = Math.max(0, Math.min((t5 - plantDelay) * 3, 1));
                plant.height = growT * plant.maxHeight;

                // Update stem geometry by scaling
                plant.stem.scale.set(1, Math.max(growT * 30, 0.1), 1);
                plant.stem.position.y = oy - 0.32 + plant.height * 0.5;
                plant.stem.material.opacity = growT * 0.8;

                // Leaves appear when stem is tall enough
                if (growT > 0.5) {
                    var leafT = (growT - 0.5) * 2;
                    plant.leaf1.visible = true;
                    plant.leaf2.visible = true;
                    var stemTop = oy - 0.32 + plant.height;
                    plant.leaf1.position.set(
                        plant.stem.position.x - 0.03 * leafT,
                        stemTop - 0.01,
                        0
                    );
                    plant.leaf2.position.set(
                        plant.stem.position.x + 0.03 * leafT,
                        stemTop - 0.01,
                        0
                    );
                    plant.leaf1.rotation.z = 0.4;
                    plant.leaf2.rotation.z = -0.4;
                    plant.leaf1.material.opacity = leafT * 0.7;
                    plant.leaf2.material.opacity = leafT * 0.7;
                    plant.leaf1.scale.setScalar(leafT);
                    plant.leaf2.scale.setScalar(leafT);
                }
            }

            // Occasional water
            if (Math.random() < 0.05) {
                this._spawnWater(ox + (Math.random() - 0.5) * 0.8, oy - 0.2);
            }
        }
        // Phase 6: Full garden, harvest glow (72-90%)
        else if (progress < 0.90) {
            var t6 = (progress - 0.72) / 0.18;
            model.position.set(ox + 0.3, oy, oz);

            // Plants sway gently
            for (var pl2 = 0; pl2 < this._plants.length; pl2++) {
                var plant2 = this._plants[pl2];
                var sway = Math.sin(time * 2 + pl2 * 0.5) * 0.02;
                plant2.stem.rotation.z = sway;
                if (plant2.leaf1.visible) {
                    plant2.leaf1.rotation.z = 0.4 + sway;
                    plant2.leaf2.rotation.z = -0.4 + sway;
                }
            }

            // Harvest glow pulses
            this._harvestGlow.material.opacity = t6 * 0.15 * (1 + Math.sin(time * 3) * 0.3);
            this._harvestGlow.scale.setScalar(1 + Math.sin(time * 2) * 0.1);
        }
        // Phase 7: Fade out (90-100%)
        else {
            var t7 = (progress - 0.90) / 0.10;
            this._bed.material.opacity = 0.7 * (1 - t7);
            for (var f2 = 0; f2 < this._furrows.length; f2++) {
                this._furrows[f2].mesh.material.opacity = 0.6 * (1 - t7);
            }
            for (var pl3 = 0; pl3 < this._plants.length; pl3++) {
                var plant3 = this._plants[pl3];
                plant3.stem.material.opacity = 0.8 * (1 - t7);
                plant3.leaf1.material.opacity = 0.7 * (1 - t7);
                plant3.leaf2.material.opacity = 0.7 * (1 - t7);
            }
            this._harvestGlow.material.opacity = 0.15 * (1 - t7);

            model.position.set(
                ox + 0.3 * (1 - t7),
                oy,
                oz
            );
            if (t7 > 0.8) {
                model.position.copy(this._origPos);
            }
        }

        // Update water drops
        for (var wi = 0; wi < this._waterDrops.length; wi++) {
            var wd = this._waterDrops[wi];
            if (wd.life <= 0) continue;
            wd.life -= delta;
            if (wd.life <= 0) { wd.mesh.visible = false; continue; }
            wd.mesh.position.x += wd.vx * delta;
            wd.mesh.position.y += wd.vy * delta;
            wd.mesh.material.opacity = 0.6 * (wd.life / wd.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._bed) { scene.remove(this._bed); this._bed.geometry.dispose(); this._bed.material.dispose(); }
        if (this._furrows) { this._furrows.forEach(function(f) { scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose(); }); }
        if (this._seeds) { this._seeds.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._waterDrops) { this._waterDrops.forEach(function(w) { scene.remove(w.mesh); w.mesh.geometry.dispose(); w.mesh.material.dispose(); }); }
        if (this._plants) {
            this._plants.forEach(function(p) {
                scene.remove(p.stem); p.stem.geometry.dispose(); p.stem.material.dispose();
                scene.remove(p.leaf1); p.leaf1.geometry.dispose(); p.leaf1.material.dispose();
                scene.remove(p.leaf2); p.leaf2.geometry.dispose(); p.leaf2.material.dispose();
            });
        }
        if (this._harvestGlow) { scene.remove(this._harvestGlow); this._harvestGlow.geometry.dispose(); this._harvestGlow.material.dispose(); }
        this._bed = this._furrows = this._seeds = this._waterDrops = this._plants = this._harvestGlow = null;
    }
};