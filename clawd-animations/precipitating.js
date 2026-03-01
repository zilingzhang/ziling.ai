export default {
    name: 'Precipitating',
    label: 'precipitating',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Cloud formation (gray sphere cluster at top)
        this._cloudSpheres = [];
        var cloudPositions = [
            { x: -0.15, y: 0.55, s: 0.12 },
            { x: 0.0, y: 0.6, s: 0.15 },
            { x: 0.15, y: 0.55, s: 0.13 },
            { x: -0.08, y: 0.65, s: 0.1 },
            { x: 0.1, y: 0.63, s: 0.11 },
            { x: -0.2, y: 0.5, s: 0.09 },
            { x: 0.22, y: 0.5, s: 0.1 }
        ];
        for (var cl = 0; cl < cloudPositions.length; cl++) {
            var cp = cloudPositions[cl];
            var cGeo = new THREE.SphereGeometry(cp.s, 8, 8);
            var cMat = new THREE.MeshBasicMaterial({
                color: 0xaaaaaa, transparent: true, opacity: 0,
                depthWrite: false
            });
            var cloud = new THREE.Mesh(cGeo, cMat);
            cloud.position.set(ox + cp.x, oy + cp.y, -0.02);
            scene.add(cloud);
            this._cloudSpheres.push({
                mesh: cloud, baseX: cp.x, baseY: cp.y, baseS: cp.s
            });
        }

        // Moisture accumulation particles (gather into cloud)
        this._moistureAcc = [];
        var maGeo = new THREE.SphereGeometry(0.015, 4, 4);
        for (var ma = 0; ma < 15; ma++) {
            var maMat = new THREE.MeshBasicMaterial({
                color: 0xbbccdd, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var maMesh = new THREE.Mesh(maGeo, maMat);
            maMesh.visible = false;
            scene.add(maMesh);
            this._moistureAcc.push({
                mesh: maMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._maIdx = 0;

        // Rain drops (fast-falling cylinders)
        this._rainDrops = [];
        var rainGeo = new THREE.BoxGeometry(0.004, 0.04, 0.002);
        for (var r = 0; r < 40; r++) {
            var rMat = new THREE.MeshBasicMaterial({
                color: r % 2 === 0 ? 0x8899aa : 0x99aabb,
                transparent: true, opacity: 0,
                depthWrite: false
            });
            var rain = new THREE.Mesh(rainGeo, rMat);
            rain.visible = false;
            scene.add(rain);
            this._rainDrops.push({
                mesh: rain, life: 0, maxLife: 0,
                vx: 0, vy: 0, speed: 0
            });
        }
        this._rainIdx = 0;
        this._lastRain = 0;

        // Splash particles at ground
        this._splashes = [];
        var splGeo = new THREE.SphereGeometry(0.008, 4, 4);
        for (var sp = 0; sp < 15; sp++) {
            var spMat = new THREE.MeshBasicMaterial({
                color: 0xaabbcc, transparent: true, opacity: 0,
                depthWrite: false
            });
            var splash = new THREE.Mesh(splGeo, spMat);
            splash.visible = false;
            scene.add(splash);
            this._splashes.push({
                mesh: splash, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._splIdx = 0;

        // Storm glow
        var glowGeo = new THREE.SphereGeometry(0.5, 10, 10);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0x8899aa, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._stormGlow = new THREE.Mesh(glowGeo, glowMat);
        this._stormGlow.position.set(ox, oy + 0.3, 0);
        scene.add(this._stormGlow);
    },
    _spawnMoisture(ox, oy) {
        var m = this._moistureAcc[this._maIdx % this._moistureAcc.length];
        this._maIdx++;
        m.mesh.visible = true;
        m.mesh.position.set(
            ox + (Math.random() - 0.5) * 1.0,
            oy + 0.2 + Math.random() * 0.3,
            0
        );
        m.vx = (ox - m.mesh.position.x) * 0.5;
        m.vy = 0.3 + Math.random() * 0.2;
        m.life = 0.8 + Math.random() * 0.4;
        m.maxLife = m.life;
        m.mesh.material.opacity = 0.4;
    },
    _spawnRain(ox, oy, spread, speed) {
        var r = this._rainDrops[this._rainIdx % this._rainDrops.length];
        this._rainIdx++;
        r.mesh.visible = true;
        r.mesh.position.set(
            ox + (Math.random() - 0.5) * spread,
            oy + 0.5 + Math.random() * 0.1,
            (Math.random() - 0.5) * 0.05
        );
        r.vx = (Math.random() - 0.5) * 0.1;
        r.vy = -speed;
        r.life = 1.2 + Math.random() * 0.5;
        r.maxLife = r.life;
        r.mesh.material.opacity = 0.6;
    },
    _spawnSplash(x, y) {
        var s = this._splashes[this._splIdx % this._splashes.length];
        this._splIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x, y, 0);
        s.vx = (Math.random() - 0.5) * 0.5;
        s.vy = 0.2 + Math.random() * 0.2;
        s.life = 0.2 + Math.random() * 0.15;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.5;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        var cloudDarkness = 0;
        var rainIntensity = 0;

        // Phase 1: Cloud formation (0-15%)
        if (progress < 0.15) {
            var t = progress / 0.15;
            for (var c = 0; c < this._cloudSpheres.length; c++) {
                var cs = this._cloudSpheres[c];
                cs.mesh.material.opacity = t * 0.4;
                cs.mesh.scale.setScalar(t);
            }
            // Moisture particles gather
            if (Math.random() < 0.1 * t) {
                this._spawnMoisture(ox, oy);
            }
        }
        // Phase 2: Cloud accumulates, darkens (15-35%)
        else if (progress < 0.35) {
            var t2 = (progress - 0.15) / 0.20;
            cloudDarkness = t2;
            for (var c2 = 0; c2 < this._cloudSpheres.length; c2++) {
                var cs2 = this._cloudSpheres[c2];
                cs2.mesh.material.opacity = 0.4 + t2 * 0.3;
                // Darken color
                var gray = Math.floor(170 - t2 * 80);
                cs2.mesh.material.color.setRGB(gray / 255, gray / 255, gray / 255);
                // Slight scale growth
                cs2.mesh.scale.setScalar(1 + t2 * 0.2);
            }
            // More moisture
            if (Math.random() < 0.15) {
                this._spawnMoisture(ox, oy);
            }
        }
        // Phase 3: Critical mass, first drops (35-45%)
        else if (progress < 0.45) {
            var t3 = (progress - 0.35) / 0.10;
            cloudDarkness = 1.0;
            rainIntensity = t3 * 0.3;

            for (var c3 = 0; c3 < this._cloudSpheres.length; c3++) {
                this._cloudSpheres[c3].mesh.material.opacity = 0.7;
                this._cloudSpheres[c3].mesh.material.color.setRGB(0.35, 0.35, 0.38);
            }

            // Sparse rain
            if (time - this._lastRain > 0.15 - t3 * 0.1) {
                this._spawnRain(ox, oy, 0.4, 1.5 + t3 * 0.5);
                this._lastRain = time;
            }
        }
        // Phase 4: Heavy downpour (45-72%)
        else if (progress < 0.72) {
            var t4 = (progress - 0.45) / 0.27;
            cloudDarkness = 1.0;
            rainIntensity = 0.3 + t4 * 0.7;

            // Cloud rumbles
            for (var c4 = 0; c4 < this._cloudSpheres.length; c4++) {
                var cs4 = this._cloudSpheres[c4];
                cs4.mesh.material.opacity = 0.7 + Math.sin(time * 4 + c4) * 0.05;
                cs4.mesh.position.x = ox + cs4.baseX + Math.sin(time * 2 + c4) * 0.01;
            }

            // Heavy rain
            if (time - this._lastRain > 0.03) {
                this._spawnRain(ox, oy, 0.6 + t4 * 0.3, 2.0 + t4 * 1.0);
                if (t4 > 0.3) this._spawnRain(ox, oy, 0.6, 2.5);
                if (t4 > 0.6) this._spawnRain(ox, oy, 0.8, 2.0);
                this._lastRain = time;
            }

            // Storm glow
            this._stormGlow.material.opacity = rainIntensity * 0.08;
        }
        // Phase 5: Rain eases (72-88%)
        else if (progress < 0.88) {
            var t5 = (progress - 0.72) / 0.16;
            rainIntensity = 1.0 * (1 - t5);
            cloudDarkness = 1.0 - t5 * 0.5;

            // Cloud lightens
            for (var c5 = 0; c5 < this._cloudSpheres.length; c5++) {
                var gray5 = Math.floor(90 + t5 * 80);
                this._cloudSpheres[c5].mesh.material.color.setRGB(gray5 / 255, gray5 / 255, gray5 / 255);
                this._cloudSpheres[c5].mesh.material.opacity = 0.7 - t5 * 0.3;
            }

            // Lighter rain
            if (rainIntensity > 0.2 && time - this._lastRain > 0.1) {
                this._spawnRain(ox, oy, 0.5, 1.5);
                this._lastRain = time;
            }

            this._stormGlow.material.opacity = rainIntensity * 0.05;
        }
        // Phase 6: Clear (88-100%)
        else {
            var t6 = (progress - 0.88) / 0.12;
            for (var c6 = 0; c6 < this._cloudSpheres.length; c6++) {
                this._cloudSpheres[c6].mesh.material.opacity = 0.4 * (1 - t6);
            }
            this._stormGlow.material.opacity = 0;

            model.position.set(ox, oy, oz);
            if (t6 > 0.8) {
                model.position.copy(this._origPos);
            }
        }

        // Model stands in downpour
        if (progress > 0.35 && progress < 0.88) {
            var rainSway = Math.sin(time * 1.5) * 0.01 * rainIntensity;
            model.position.set(ox + rainSway, oy, oz);
        }

        // Update rain drops
        for (var ri = 0; ri < this._rainDrops.length; ri++) {
            var rd = this._rainDrops[ri];
            if (rd.life <= 0) continue;
            rd.life -= delta;
            if (rd.life <= 0) { rd.mesh.visible = false; continue; }
            rd.mesh.position.x += rd.vx * delta;
            rd.mesh.position.y += rd.vy * delta;
            rd.mesh.material.opacity = 0.6 * (rd.life / rd.maxLife);

            // Ground splash
            if (rd.mesh.position.y < oy - 0.5) {
                this._spawnSplash(rd.mesh.position.x, oy - 0.5);
                rd.life = 0;
                rd.mesh.visible = false;
            }
        }

        // Update moisture particles
        for (var mi = 0; mi < this._moistureAcc.length; mi++) {
            var mm = this._moistureAcc[mi];
            if (mm.life <= 0) continue;
            mm.life -= delta;
            if (mm.life <= 0) { mm.mesh.visible = false; continue; }
            mm.mesh.position.x += mm.vx * delta;
            mm.mesh.position.y += mm.vy * delta;
            mm.mesh.material.opacity = 0.4 * (mm.life / mm.maxLife);
        }

        // Update splashes
        for (var si = 0; si < this._splashes.length; si++) {
            var ss = this._splashes[si];
            if (ss.life <= 0) continue;
            ss.life -= delta;
            if (ss.life <= 0) { ss.mesh.visible = false; continue; }
            ss.mesh.position.x += ss.vx * delta;
            ss.mesh.position.y += ss.vy * delta;
            ss.vy -= 3.0 * delta;
            ss.mesh.material.opacity = 0.5 * (ss.life / ss.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._cloudSpheres) { this._cloudSpheres.forEach(function(c) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose(); }); }
        if (this._moistureAcc) { this._moistureAcc.forEach(function(m) { scene.remove(m.mesh); m.mesh.geometry.dispose(); m.mesh.material.dispose(); }); }
        if (this._rainDrops) { this._rainDrops.forEach(function(r) { scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); }); }
        if (this._splashes) { this._splashes.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._stormGlow) { scene.remove(this._stormGlow); this._stormGlow.geometry.dispose(); this._stormGlow.material.dispose(); }
        this._cloudSpheres = this._moistureAcc = this._rainDrops = this._splashes = this._stormGlow = null;
    }
};