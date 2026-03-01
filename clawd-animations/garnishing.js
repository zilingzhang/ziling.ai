export default {
    name: 'Garnishing',
    label: 'garnishing',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Plate (flat disc)
        var plateGeo = new THREE.CylinderGeometry(0.28, 0.3, 0.02, 20);
        var plateMat = new THREE.MeshBasicMaterial({
            color: 0xeeeeee, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._plate = new THREE.Mesh(plateGeo, plateMat);
        this._plate.position.set(ox - 0.2, oy - 0.25, 0);
        this._plate.rotation.x = Math.PI * 0.5;
        scene.add(this._plate);

        // Plate rim ring
        var rimGeo = new THREE.TorusGeometry(0.29, 0.01, 8, 24);
        var rimMat = new THREE.MeshBasicMaterial({
            color: 0xcccccc, transparent: true, opacity: 0
        });
        this._rim = new THREE.Mesh(rimGeo, rimMat);
        this._rim.position.set(ox - 0.2, oy - 0.25, 0);
        this._rim.rotation.x = Math.PI * 0.5;
        scene.add(this._rim);

        // Main food item (mound shape)
        var foodGeo = new THREE.SphereGeometry(0.1, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6);
        var foodMat = new THREE.MeshBasicMaterial({
            color: 0xaa7744, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._food = new THREE.Mesh(foodGeo, foodMat);
        this._food.position.set(ox - 0.2, oy - 0.22, 0);
        this._food.rotation.x = Math.PI;
        scene.add(this._food);

        // Garnish leaves (small green discs)
        this._leaves = [];
        var leafGeo = new THREE.CircleGeometry(0.025, 6);
        for (var i = 0; i < 5; i++) {
            var lMat = new THREE.MeshBasicMaterial({
                color: 0x33aa33, transparent: true, opacity: 0,
                side: THREE.DoubleSide
            });
            var leaf = new THREE.Mesh(leafGeo, lMat);
            leaf.visible = false;
            leaf.userData.targetX = ox - 0.2 + (Math.random() - 0.5) * 0.12;
            leaf.userData.targetY = oy - 0.20 + Math.random() * 0.04;
            scene.add(leaf);
            this._leaves.push(leaf);
        }

        // Berry spheres
        this._berries = [];
        var berryGeo = new THREE.SphereGeometry(0.018, 8, 8);
        for (var j = 0; j < 4; j++) {
            var bMat = new THREE.MeshBasicMaterial({
                color: 0xcc2222, transparent: true, opacity: 0
            });
            var berry = new THREE.Mesh(berryGeo, bMat);
            berry.visible = false;
            berry.userData.targetX = ox - 0.2 + (Math.random() - 0.5) * 0.1;
            berry.userData.targetY = oy - 0.19 + Math.random() * 0.02;
            scene.add(berry);
            this._berries.push(berry);
        }

        // Sauce drizzle line (thin tube)
        var drizzlePath = new THREE.CurvePath();
        var curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(ox - 0.32, oy - 0.24, 0),
            new THREE.Vector3(ox - 0.2, oy - 0.20, 0),
            new THREE.Vector3(ox - 0.08, oy - 0.26, 0)
        );
        drizzlePath.add(curve);
        var drizzleGeo = new THREE.TubeGeometry(curve, 20, 0.005, 6, false);
        var drizzleMat = new THREE.MeshBasicMaterial({
            color: 0x884400, transparent: true, opacity: 0
        });
        this._drizzle = new THREE.Mesh(drizzleGeo, drizzleMat);
        scene.add(this._drizzle);

        // Precision sparkle particles
        this._sparkles = [];
        var sparkGeo = new THREE.SphereGeometry(0.008, 4, 4);
        for (var k = 0; k < 20; k++) {
            var skMat = new THREE.MeshBasicMaterial({
                color: 0xffffcc, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sk = new THREE.Mesh(sparkGeo, skMat);
            sk.visible = false;
            scene.add(sk);
            this._sparkles.push({
                mesh: sk, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._sparkIdx = 0;

        // Final presentation glow
        var glowGeo = new THREE.SphereGeometry(0.35, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xffffdd, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._presGlow = new THREE.Mesh(glowGeo, glowMat);
        this._presGlow.position.set(ox - 0.2, oy - 0.2, -0.1);
        scene.add(this._presGlow);
    },
    _spawnSparkle(x, y) {
        var s = this._sparkles[this._sparkIdx % this._sparkles.length];
        this._sparkIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x, y, 0.05);
        s.vx = (Math.random() - 0.5) * 0.3;
        s.vy = (Math.random() - 0.5) * 0.3;
        s.life = 0.3 + Math.random() * 0.3;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.8;
        s.mesh.scale.setScalar(0.5 + Math.random() * 1.0);
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        if (progress < 0.10) {
            // Phase 1: Plate and food appear
            var t = progress / 0.10;
            var ease = t * t;
            this._plate.material.opacity = ease * 0.7;
            this._rim.material.opacity = ease * 0.5;
            this._food.material.opacity = ease * 0.8;
            model.position.set(ox + 0.15, oy + 0.05, oz);
        } else if (progress < 0.30) {
            // Phase 2: Place leaves carefully, one by one
            var t2 = (progress - 0.10) / 0.20;
            this._plate.material.opacity = 0.7;
            this._rim.material.opacity = 0.5;
            this._food.material.opacity = 0.8;

            var numLeaves = Math.floor(t2 * this._leaves.length);
            for (var i = 0; i < this._leaves.length; i++) {
                var leaf = this._leaves[i];
                if (i < numLeaves) {
                    leaf.visible = true;
                    leaf.position.set(leaf.userData.targetX, leaf.userData.targetY, 0.01);
                    leaf.material.opacity = 0.8;
                    leaf.rotation.z = Math.sin(time * 0.5 + i) * 0.1 + i * 0.5;
                } else if (i === numLeaves) {
                    // Currently being placed
                    var placeT = (t2 * this._leaves.length) - numLeaves;
                    leaf.visible = true;
                    leaf.position.set(
                        ox + 0.1 + (leaf.userData.targetX - ox - 0.1) * placeT,
                        oy + 0.1 + (leaf.userData.targetY - oy - 0.1) * placeT,
                        0.01
                    );
                    leaf.material.opacity = placeT * 0.8;
                    // Sparkle on placement
                    if (placeT > 0.8 && Math.random() < 0.3) {
                        this._spawnSparkle(leaf.userData.targetX, leaf.userData.targetY);
                    }
                }
            }

            // Model carefully positions
            model.position.set(ox + 0.15, oy + 0.05 - t2 * 0.02, oz);
            model.rotation.z = -0.03;
        } else if (progress < 0.50) {
            // Phase 3: Place berries
            var t3 = (progress - 0.30) / 0.20;

            // All leaves placed
            for (var li = 0; li < this._leaves.length; li++) {
                this._leaves[li].visible = true;
                this._leaves[li].material.opacity = 0.8;
            }

            var numBerries = Math.floor(t3 * this._berries.length);
            for (var j = 0; j < this._berries.length; j++) {
                var berry = this._berries[j];
                if (j < numBerries) {
                    berry.visible = true;
                    berry.position.set(berry.userData.targetX, berry.userData.targetY, 0.02);
                    berry.material.opacity = 0.9;
                } else if (j === numBerries) {
                    var berryT = (t3 * this._berries.length) - numBerries;
                    berry.visible = true;
                    berry.position.set(
                        ox + 0.1 + (berry.userData.targetX - ox - 0.1) * berryT,
                        oy + 0.1 + (berry.userData.targetY - oy - 0.1) * berryT,
                        0.02
                    );
                    berry.material.opacity = berryT * 0.9;
                    if (berryT > 0.8 && Math.random() < 0.3) {
                        this._spawnSparkle(berry.userData.targetX, berry.userData.targetY);
                    }
                }
            }

            model.position.set(ox + 0.15, oy + 0.03, oz);
            model.rotation.z = -0.02;
        } else if (progress < 0.70) {
            // Phase 4: Sauce drizzle appears
            var t4 = (progress - 0.50) / 0.20;

            // All berries placed
            for (var bi = 0; bi < this._berries.length; bi++) {
                this._berries[bi].visible = true;
                this._berries[bi].material.opacity = 0.9;
            }

            // Drizzle draws itself (scale x from 0)
            this._drizzle.material.opacity = t4 * 0.7;

            // Sparkle along drizzle path
            if (Math.random() < 0.08) {
                var drizzleX = ox - 0.32 + t4 * 0.24;
                this._spawnSparkle(drizzleX, oy - 0.23);
            }

            // Model makes drizzle motion
            model.position.set(
                ox + 0.15 - t4 * 0.05,
                oy + 0.03,
                oz
            );
            model.rotation.z = t4 * 0.03;
        } else if (progress < 0.88) {
            // Phase 5: Final presentation glow
            var t5 = (progress - 0.70) / 0.18;
            this._drizzle.material.opacity = 0.7;

            // Presentation glow builds
            this._presGlow.material.opacity = t5 * 0.3;
            this._presGlow.scale.setScalar(1 + Math.sin(time * 3) * 0.1);

            // Gentle sparkles around the plate
            if (Math.random() < 0.06) {
                var sparkAngle = Math.random() * Math.PI * 2;
                this._spawnSparkle(
                    ox - 0.2 + Math.cos(sparkAngle) * 0.25,
                    oy - 0.22 + Math.sin(sparkAngle) * 0.08
                );
            }

            model.position.set(ox + 0.1, oy + 0.03, oz);
            model.rotation.z = 0;
        } else {
            // Phase 6: Fade out
            var t6 = (progress - 0.88) / 0.12;
            this._plate.material.opacity = 0.7 * (1 - t6);
            this._rim.material.opacity = 0.5 * (1 - t6);
            this._food.material.opacity = 0.8 * (1 - t6);
            this._drizzle.material.opacity = 0.7 * (1 - t6);
            this._presGlow.material.opacity = 0.3 * (1 - t6);
            for (var fl = 0; fl < this._leaves.length; fl++) {
                this._leaves[fl].material.opacity = 0.8 * (1 - t6);
            }
            for (var fb = 0; fb < this._berries.length; fb++) {
                this._berries[fb].material.opacity = 0.9 * (1 - t6);
            }

            model.position.set(ox + 0.1 * (1 - t6), oy + 0.03 * (1 - t6), oz);
            model.scale.copy(this._origScale);
        }

        // Update sparkles
        for (var si = 0; si < this._sparkles.length; si++) {
            var sp = this._sparkles[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            var lr = sp.life / sp.maxLife;
            sp.mesh.material.opacity = lr * 0.8;
            sp.mesh.scale.setScalar(sp.mesh.scale.x * (0.97 + lr * 0.03));
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._plate) { scene.remove(this._plate); this._plate.geometry.dispose(); this._plate.material.dispose(); }
        if (this._rim) { scene.remove(this._rim); this._rim.geometry.dispose(); this._rim.material.dispose(); }
        if (this._food) { scene.remove(this._food); this._food.geometry.dispose(); this._food.material.dispose(); }
        if (this._drizzle) { scene.remove(this._drizzle); this._drizzle.geometry.dispose(); this._drizzle.material.dispose(); }
        if (this._presGlow) { scene.remove(this._presGlow); this._presGlow.geometry.dispose(); this._presGlow.material.dispose(); }
        if (this._leaves) { this._leaves.forEach(function(l) { scene.remove(l); l.geometry.dispose(); l.material.dispose(); }); }
        if (this._berries) { this._berries.forEach(function(b) { scene.remove(b); b.geometry.dispose(); b.material.dispose(); }); }
        if (this._sparkles) { this._sparkles.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        this._plate = this._rim = this._food = this._drizzle = this._presGlow = this._leaves = this._berries = this._sparkles = null;
    }
};
