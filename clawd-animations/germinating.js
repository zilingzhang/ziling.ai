export default {
    name: 'Germinating',
    label: 'germinating',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Soil surface disc
        var soilGeo = new THREE.BoxGeometry(0.8, 0.04, 0.3);
        var soilMat = new THREE.MeshBasicMaterial({
            color: 0x664422, transparent: true, opacity: 0
        });
        this._soil = new THREE.Mesh(soilGeo, soilMat);
        this._soil.position.set(ox, oy - 0.2, -0.02);
        scene.add(this._soil);

        // Underground zone (darker brown)
        var underGeo = new THREE.BoxGeometry(0.8, 0.3, 0.3);
        var underMat = new THREE.MeshBasicMaterial({
            color: 0x442211, transparent: true, opacity: 0
        });
        this._underground = new THREE.Mesh(underGeo, underMat);
        this._underground.position.set(ox, oy - 0.37, -0.03);
        scene.add(this._underground);

        // Seed (sphere below surface)
        var seedGeo = new THREE.SphereGeometry(0.04, 8, 8);
        var seedMat = new THREE.MeshBasicMaterial({
            color: 0x885533, transparent: true, opacity: 0
        });
        this._seed = new THREE.Mesh(seedGeo, seedMat);
        this._seed.position.set(ox, oy - 0.35, 0);
        scene.add(this._seed);

        // Moisture particles seeping down
        this._moisture = [];
        var moistGeo = new THREE.SphereGeometry(0.008, 4, 4);
        for (var m = 0; m < 20; m++) {
            var mMat = new THREE.MeshBasicMaterial({
                color: 0x6699cc, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var moist = new THREE.Mesh(moistGeo, mMat);
            moist.visible = false;
            scene.add(moist);
            this._moisture.push({
                mesh: moist, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._moistIdx = 0;

        // Root line segments extending down
        this._roots = [];
        for (var r = 0; r < 5; r++) {
            var rGeo = new THREE.BoxGeometry(0.008, 0.0, 0.005);
            var rMat = new THREE.MeshBasicMaterial({
                color: 0x886644, transparent: true, opacity: 0
            });
            var root = new THREE.Mesh(rGeo, rMat);
            root.position.set(ox, oy - 0.38, 0);
            root.visible = false;
            scene.add(root);
            var angle = -Math.PI / 2 + (r - 2) * 0.3;
            this._roots.push({
                mesh: root,
                angle: angle,
                length: 0,
                maxLength: 0.06 + Math.random() * 0.06
            });
        }

        // Shoot pushing up
        var shootGeo = new THREE.BoxGeometry(0.012, 0.0, 0.008);
        var shootMat = new THREE.MeshBasicMaterial({
            color: 0x44aa33, transparent: true, opacity: 0
        });
        this._shoot = new THREE.Mesh(shootGeo, shootMat);
        this._shoot.position.set(ox, oy - 0.2, 0);
        scene.add(this._shoot);

        // First leaves (two small circles)
        var leafGeo = new THREE.CircleGeometry(0.025, 6);
        var leafMat1 = new THREE.MeshBasicMaterial({
            color: 0x55cc33, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        var leafMat2 = new THREE.MeshBasicMaterial({
            color: 0x55cc33, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._leaf1 = new THREE.Mesh(leafGeo, leafMat1);
        this._leaf2 = new THREE.Mesh(leafGeo, leafMat2);
        this._leaf1.visible = false;
        this._leaf2.visible = false;
        scene.add(this._leaf1);
        scene.add(this._leaf2);

        // Life force glow
        var glowGeo = new THREE.SphereGeometry(0.15, 10, 10);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0x66dd44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._lifeGlow = new THREE.Mesh(glowGeo, glowMat);
        this._lifeGlow.position.set(ox, oy - 0.1, 0);
        scene.add(this._lifeGlow);

        // Soil break particles
        this._soilBreak = [];
        var sbGeo = new THREE.SphereGeometry(0.01, 4, 4);
        for (var sb = 0; sb < 10; sb++) {
            var sbMat = new THREE.MeshBasicMaterial({
                color: 0x775533, transparent: true, opacity: 0
            });
            var sbMesh = new THREE.Mesh(sbGeo, sbMat);
            sbMesh.visible = false;
            scene.add(sbMesh);
            this._soilBreak.push({
                mesh: sbMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._sbIdx = 0;
    },
    _spawnMoisture(ox, oy) {
        var m = this._moisture[this._moistIdx % this._moisture.length];
        this._moistIdx++;
        m.mesh.visible = true;
        m.mesh.position.set(
            ox + (Math.random() - 0.5) * 0.3,
            oy - 0.15,
            0
        );
        m.vx = (Math.random() - 0.5) * 0.03;
        m.vy = -0.1 - Math.random() * 0.08;
        m.life = 0.6 + Math.random() * 0.4;
        m.maxLife = m.life;
        m.mesh.material.opacity = 0.5;
    },
    _spawnSoilBreak(x, y) {
        var sb = this._soilBreak[this._sbIdx % this._soilBreak.length];
        this._sbIdx++;
        sb.mesh.visible = true;
        sb.mesh.position.set(x + (Math.random() - 0.5) * 0.05, y, 0);
        sb.vx = (Math.random() - 0.5) * 0.3;
        sb.vy = 0.1 + Math.random() * 0.15;
        sb.life = 0.4 + Math.random() * 0.3;
        sb.maxLife = sb.life;
        sb.mesh.material.opacity = 0.7;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        // Phase 1: Underground scene appears (0-10%)
        if (progress < 0.10) {
            var t = progress / 0.10;
            this._soil.material.opacity = t * 0.6;
            this._underground.material.opacity = t * 0.3;
            this._seed.material.opacity = t * 0.8;
            model.position.set(ox + 0.3, oy, oz);
        }
        // Phase 2: Moisture seeps down (10-25%)
        else if (progress < 0.25) {
            var t2 = (progress - 0.10) / 0.15;
            this._soil.material.opacity = 0.6;
            this._underground.material.opacity = 0.3;
            this._seed.material.opacity = 0.8;

            // Spawn moisture
            if (Math.random() < 0.15) {
                this._spawnMoisture(ox, oy);
            }

            model.position.set(ox + 0.3, oy, oz);
        }
        // Phase 3: Seed swells (25-35%)
        else if (progress < 0.35) {
            var t3 = (progress - 0.25) / 0.10;
            var swell = 1 + t3 * 0.5;
            this._seed.scale.setScalar(swell);
            // Seed lightens color slightly
            this._seed.material.color.setHex(0x885533);

            if (Math.random() < 0.08) {
                this._spawnMoisture(ox, oy);
            }

            // Inner glow on seed
            this._lifeGlow.position.set(ox, oy - 0.35, 0);
            this._lifeGlow.material.opacity = t3 * 0.1;
            this._lifeGlow.scale.setScalar(0.5);

            model.position.set(ox + 0.3, oy, oz);
        }
        // Phase 4: Root extends down (35-48%)
        else if (progress < 0.48) {
            var t4 = (progress - 0.35) / 0.13;
            this._seed.scale.setScalar(1.5);

            // Roots grow
            for (var r = 0; r < this._roots.length; r++) {
                var root = this._roots[r];
                var rootDelay = r * 0.15;
                var rootT = Math.max(0, Math.min((t4 - rootDelay) * 3, 1));
                root.length = rootT * root.maxLength;
                root.mesh.visible = rootT > 0;
                root.mesh.scale.set(1, Math.max(rootT * 20, 0.1), 1);
                root.mesh.position.set(
                    ox + Math.cos(root.angle) * root.length * 0.5,
                    oy - 0.38 + Math.sin(root.angle) * root.length * 0.5,
                    0
                );
                root.mesh.rotation.z = root.angle + Math.PI / 2;
                root.mesh.material.opacity = rootT * 0.7;
            }

            this._lifeGlow.material.opacity = 0.1 + t4 * 0.05;
            model.position.set(ox + 0.3, oy, oz);
        }
        // Phase 5: Shoot pushes up through soil (48-68%)
        else if (progress < 0.68) {
            var t5 = (progress - 0.48) / 0.20;
            // Keep roots visible
            for (var r2 = 0; r2 < this._roots.length; r2++) {
                this._roots[r2].mesh.material.opacity = 0.7;
            }

            // Shoot grows upward
            var shootHeight = t5 * 0.2;
            this._shoot.scale.set(1, Math.max(t5 * 40, 0.1), 1);
            this._shoot.position.set(ox, oy - 0.2 + shootHeight * 0.5, 0);
            this._shoot.material.opacity = Math.min(t5 * 2, 0.8);

            // Soil break when shoot reaches surface
            if (t5 > 0.3 && t5 < 0.5 && Math.random() < 0.15) {
                this._spawnSoilBreak(ox, oy - 0.18);
            }

            // Life glow follows shoot tip
            this._lifeGlow.position.set(ox, oy - 0.2 + shootHeight, 0);
            this._lifeGlow.material.opacity = 0.15 + t5 * 0.1;
            this._lifeGlow.scale.setScalar(0.5 + t5 * 0.3);

            model.position.set(ox + 0.3, oy, oz);
        }
        // Phase 6: Leaves unfold (68-85%)
        else if (progress < 0.85) {
            var t6 = (progress - 0.68) / 0.17;
            // Shoot at full height
            this._shoot.scale.set(1, 40, 1);
            this._shoot.position.set(ox, oy - 0.1, 0);
            this._shoot.material.opacity = 0.8;

            // Leaves unfold
            var leafT = Math.min(t6 * 1.5, 1);
            this._leaf1.visible = true;
            this._leaf2.visible = true;
            var shootTop = oy - 0.0;
            this._leaf1.position.set(ox - 0.03 * leafT, shootTop, 0);
            this._leaf2.position.set(ox + 0.03 * leafT, shootTop, 0);
            this._leaf1.rotation.z = 0.5 * leafT;
            this._leaf2.rotation.z = -0.5 * leafT;
            this._leaf1.scale.setScalar(leafT);
            this._leaf2.scale.setScalar(leafT);
            this._leaf1.material.opacity = leafT * 0.7;
            this._leaf2.material.opacity = leafT * 0.7;

            // Gentle sway
            var sway = Math.sin(time * 2) * 0.01;
            this._leaf1.rotation.z = 0.5 * leafT + sway;
            this._leaf2.rotation.z = -0.5 * leafT + sway;

            // Life force glow pulses
            this._lifeGlow.position.set(ox, shootTop, 0);
            this._lifeGlow.material.opacity = 0.25 * (1 + Math.sin(time * 3) * 0.3);
            this._lifeGlow.scale.setScalar(0.8 + Math.sin(time * 2) * 0.1);

            model.position.set(ox + 0.3, oy, oz);
        }
        // Phase 7: Fade out (85-100%)
        else {
            var t7 = (progress - 0.85) / 0.15;
            this._soil.material.opacity = 0.6 * (1 - t7);
            this._underground.material.opacity = 0.3 * (1 - t7);
            this._seed.material.opacity = 0.8 * (1 - t7);
            this._shoot.material.opacity = 0.8 * (1 - t7);
            this._leaf1.material.opacity = 0.7 * (1 - t7);
            this._leaf2.material.opacity = 0.7 * (1 - t7);
            this._lifeGlow.material.opacity = 0.25 * (1 - t7);
            for (var r3 = 0; r3 < this._roots.length; r3++) {
                this._roots[r3].mesh.material.opacity = 0.7 * (1 - t7);
            }

            model.position.set(
                ox + 0.3 * (1 - t7),
                oy,
                oz
            );
            if (t7 > 0.8) {
                model.position.copy(this._origPos);
            }
        }

        // Update moisture
        for (var mi = 0; mi < this._moisture.length; mi++) {
            var mm = this._moisture[mi];
            if (mm.life <= 0) continue;
            mm.life -= delta;
            if (mm.life <= 0) { mm.mesh.visible = false; continue; }
            mm.mesh.position.x += mm.vx * delta;
            mm.mesh.position.y += mm.vy * delta;
            mm.mesh.material.opacity = 0.5 * (mm.life / mm.maxLife);
        }

        // Update soil break particles
        for (var si = 0; si < this._soilBreak.length; si++) {
            var sbp = this._soilBreak[si];
            if (sbp.life <= 0) continue;
            sbp.life -= delta;
            if (sbp.life <= 0) { sbp.mesh.visible = false; continue; }
            sbp.mesh.position.x += sbp.vx * delta;
            sbp.mesh.position.y += sbp.vy * delta;
            sbp.vy -= 1.5 * delta;
            sbp.mesh.material.opacity = 0.7 * (sbp.life / sbp.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._soil) { scene.remove(this._soil); this._soil.geometry.dispose(); this._soil.material.dispose(); }
        if (this._underground) { scene.remove(this._underground); this._underground.geometry.dispose(); this._underground.material.dispose(); }
        if (this._seed) { scene.remove(this._seed); this._seed.geometry.dispose(); this._seed.material.dispose(); }
        if (this._moisture) { this._moisture.forEach(function(m) { scene.remove(m.mesh); m.mesh.geometry.dispose(); m.mesh.material.dispose(); }); }
        if (this._roots) { this._roots.forEach(function(r) { scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); }); }
        if (this._shoot) { scene.remove(this._shoot); this._shoot.geometry.dispose(); this._shoot.material.dispose(); }
        if (this._leaf1) { scene.remove(this._leaf1); this._leaf1.geometry.dispose(); this._leaf1.material.dispose(); }
        if (this._leaf2) { scene.remove(this._leaf2); this._leaf2.geometry.dispose(); this._leaf2.material.dispose(); }
        if (this._lifeGlow) { scene.remove(this._lifeGlow); this._lifeGlow.geometry.dispose(); this._lifeGlow.material.dispose(); }
        if (this._soilBreak) { this._soilBreak.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        this._soil = this._underground = this._seed = this._moisture = this._roots = this._shoot = this._leaf1 = this._leaf2 = this._lifeGlow = this._soilBreak = null;
    }
};