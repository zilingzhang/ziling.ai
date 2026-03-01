export default {
    name: 'Drizzling',
    label: 'drizzling',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Cloud puff - group of overlapping translucent spheres
        this._cloudGroup = new THREE.Group();
        this._cloudParts = [];
        var cloudPositions = [
            { x: 0, y: 0, s: 0.25 },
            { x: -0.2, y: 0.05, s: 0.2 },
            { x: 0.22, y: 0.03, s: 0.22 },
            { x: -0.08, y: 0.12, s: 0.18 },
            { x: 0.1, y: 0.1, s: 0.2 }
        ];
        for (var c = 0; c < cloudPositions.length; c++) {
            var cp = cloudPositions[c];
            var cGeo = new THREE.SphereGeometry(cp.s, 8, 8);
            var cMat = new THREE.MeshBasicMaterial({
                color: c % 2 === 0 ? 0x99aabb : 0xaabbcc,
                transparent: true, opacity: 0
            });
            var cMesh = new THREE.Mesh(cGeo, cMat);
            cMesh.position.set(cp.x, cp.y, 0);
            this._cloudGroup.add(cMesh);
            this._cloudParts.push(cMesh);
        }
        this._cloudGroup.position.set(this._origPos.x, this._origPos.y + 1.1, -0.1);
        scene.add(this._cloudGroup);

        // Raindrop cylinders - thin fast-falling
        this._raindrops = [];
        var rainGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.08, 4);
        for (var r = 0; r < 30; r++) {
            var rMat = new THREE.MeshBasicMaterial({
                color: r % 3 === 0 ? 0x6699cc : (r % 3 === 1 ? 0x88bbdd : 0x5588bb),
                transparent: true, opacity: 0
            });
            var rain = new THREE.Mesh(rainGeo, rMat);
            rain.visible = false;
            scene.add(rain);
            this._raindrops.push({
                mesh: rain, life: 0, maxLife: 0,
                vx: 0, vy: 0, active: false
            });
        }
        this._rainIdx = 0;

        // Puddle rings - torus rings on the ground
        this._puddles = [];
        for (var p = 0; p < 10; p++) {
            var pGeo = new THREE.TorusGeometry(0.01, 0.003, 6, 16);
            var pMat = new THREE.MeshBasicMaterial({
                color: 0x88aacc, transparent: true, opacity: 0
            });
            var puddle = new THREE.Mesh(pGeo, pMat);
            puddle.rotation.x = Math.PI / 2;
            puddle.visible = false;
            scene.add(puddle);
            this._puddles.push({
                mesh: puddle, life: 0, maxLife: 0,
                active: false, baseX: 0, baseY: 0
            });
        }
        this._pudIdx = 0;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var intensity = 0;
        var windSway = 0;

        // Phase: Cloud forms (0-10%)
        if (progress < 0.10) {
            intensity = 0;
            var cloudFade = progress / 0.10;
            for (var c = 0; c < this._cloudParts.length; c++) {
                this._cloudParts[c].material.opacity = cloudFade * 0.5;
            }
        }
        // Phase: Light drizzle starts (10-30%)
        else if (progress < 0.30) {
            intensity = (progress - 0.10) / 0.20;
            for (var c2 = 0; c2 < this._cloudParts.length; c2++) {
                this._cloudParts[c2].material.opacity = 0.5;
            }
        }
        // Phase: Steady drizzle, puddle rings (30-70%)
        else if (progress < 0.70) {
            intensity = 0.7;
            for (var c3 = 0; c3 < this._cloudParts.length; c3++) {
                this._cloudParts[c3].material.opacity = 0.55 + Math.sin(time * 2 + c3) * 0.05;
            }
        }
        // Phase: Heavier drizzle with wind sway (70-85%)
        else if (progress < 0.85) {
            intensity = 1.0;
            windSway = 0.3;
            for (var c4 = 0; c4 < this._cloudParts.length; c4++) {
                this._cloudParts[c4].material.opacity = 0.6;
            }
        }
        // Phase: Drizzle eases, cloud thins (85-95%)
        else if (progress < 0.95) {
            var easeFactor = (progress - 0.85) / 0.10;
            intensity = 1.0 - easeFactor * 0.9;
            windSway = 0.3 * (1 - easeFactor);
            for (var c5 = 0; c5 < this._cloudParts.length; c5++) {
                this._cloudParts[c5].material.opacity = 0.6 * (1 - easeFactor);
            }
        }
        // Phase: Clear (95-100%)
        else {
            intensity = 0;
            for (var c6 = 0; c6 < this._cloudParts.length; c6++) {
                this._cloudParts[c6].material.opacity = 0;
            }
        }

        // Cloud gentle drift
        this._cloudGroup.position.x = orig.x + Math.sin(time * 0.4) * 0.1;

        // Spawn raindrops
        var spawnRate = intensity * 0.6;
        if (intensity > 0.1 && Math.random() < spawnRate) {
            var rd = this._raindrops[this._rainIdx % this._raindrops.length];
            this._rainIdx++;
            rd.active = true;
            rd.mesh.visible = true;
            rd.mesh.position.set(
                orig.x + (Math.random() - 0.5) * 1.6,
                orig.y + 1.0 + Math.random() * 0.3,
                (Math.random() - 0.5) * 0.2
            );
            rd.vx = windSway * (-0.5 + Math.random() * 0.2);
            rd.vy = -2.5 - Math.random() * 1.5;
            rd.life = 0.8 + Math.random() * 0.4;
            rd.maxLife = rd.life;
            rd.mesh.material.opacity = 0.5 * intensity;
        }

        // Update raindrops
        var groundY = orig.y - 0.7;
        for (var ri = 0; ri < this._raindrops.length; ri++) {
            var r = this._raindrops[ri];
            if (!r.active) continue;
            r.life -= delta;
            if (r.life <= 0 || r.mesh.position.y < groundY) {
                // Spawn puddle ring where it lands
                if (r.mesh.position.y < groundY + 0.1 && intensity > 0.2) {
                    var pd = this._puddles[this._pudIdx % this._puddles.length];
                    this._pudIdx++;
                    pd.active = true;
                    pd.mesh.visible = true;
                    pd.baseX = r.mesh.position.x;
                    pd.baseY = groundY;
                    pd.mesh.position.set(pd.baseX, pd.baseY, r.mesh.position.z);
                    pd.mesh.scale.setScalar(0.3);
                    pd.life = 0.8 + Math.random() * 0.4;
                    pd.maxLife = pd.life;
                    pd.mesh.material.opacity = 0.5;
                }
                r.active = false;
                r.mesh.visible = false;
                continue;
            }
            r.mesh.position.x += r.vx * delta;
            r.mesh.position.y += r.vy * delta;
            r.mesh.material.opacity = 0.5 * (r.life / r.maxLife) * intensity;
        }

        // Update puddle rings - expand and fade
        for (var pi = 0; pi < this._puddles.length; pi++) {
            var pd2 = this._puddles[pi];
            if (!pd2.active) continue;
            pd2.life -= delta;
            if (pd2.life <= 0) { pd2.active = false; pd2.mesh.visible = false; continue; }
            var puddleProgress = 1 - (pd2.life / pd2.maxLife);
            pd2.mesh.scale.setScalar(0.3 + puddleProgress * 3.0);
            pd2.mesh.material.opacity = 0.5 * (1 - puddleProgress);
        }

        // Model gentle sway in the rain
        var sway = Math.sin(time * 1.5) * 0.02 * intensity;
        var windPush = windSway * 0.05 * Math.sin(time * 2);
        model.position.set(orig.x + windPush, orig.y, orig.z);
        model.rotation.z = sway + windPush * 0.5;

        // Settle at end
        if (progress >= 0.95) {
            var settle = (progress - 0.95) / 0.05;
            model.position.set(
                orig.x + windPush * (1 - settle),
                orig.y,
                orig.z
            );
            model.rotation.z = (sway + windPush * 0.5) * (1 - settle);
            if (settle > 0.8) {
                model.position.copy(orig);
                model.rotation.z = 0;
            }
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._cloudGroup) {
            this._cloudGroup.traverse(function(child) {
                if (child.isMesh) { child.geometry.dispose(); child.material.dispose(); }
            });
            scene.remove(this._cloudGroup);
        }
        if (this._raindrops) { this._raindrops.forEach(function(r) { scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); }); }
        if (this._puddles) { this._puddles.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }); }
        this._cloudGroup = this._cloudParts = this._raindrops = this._puddles = null;
    }
};
