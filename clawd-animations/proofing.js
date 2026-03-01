export default {
    name: 'Proofing',
    label: 'proofing',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Dough (sphere that slowly expands)
        var doughGeo = new THREE.SphereGeometry(0.12, 12, 12);
        var doughMat = new THREE.MeshBasicMaterial({
            color: 0xf0deb0, transparent: true, opacity: 0
        });
        this._dough = new THREE.Mesh(doughGeo, doughMat);
        this._dough.position.set(ox - 0.25, oy - 0.22, 0);
        scene.add(this._dough);

        // Cloth cover (translucent flat disc)
        var clothGeo = new THREE.CircleGeometry(0.2, 16);
        var clothMat = new THREE.MeshBasicMaterial({
            color: 0xeeeedd, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._cloth = new THREE.Mesh(clothGeo, clothMat);
        this._cloth.position.set(ox - 0.25, oy - 0.14, 0);
        scene.add(this._cloth);

        // CO2 micro-bubbles
        this._co2 = [];
        var co2Geo = new THREE.SphereGeometry(0.008, 4, 4);
        for (var i = 0; i < 25; i++) {
            var cMat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var cMesh = new THREE.Mesh(co2Geo, cMat);
            cMesh.visible = false;
            scene.add(cMesh);
            this._co2.push({
                mesh: cMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._co2Idx = 0;

        // Temperature warmth glow
        var warmGeo = new THREE.SphereGeometry(0.25, 10, 10);
        var warmMat = new THREE.MeshBasicMaterial({
            color: 0xffaa44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._warmGlow = new THREE.Mesh(warmGeo, warmMat);
        this._warmGlow.position.set(ox - 0.25, oy - 0.2, 0);
        scene.add(this._warmGlow);

        // Ready glow (final)
        var readyGeo = new THREE.SphereGeometry(0.3, 10, 10);
        var readyMat = new THREE.MeshBasicMaterial({
            color: 0xffdd66, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._readyGlow = new THREE.Mesh(readyGeo, readyMat);
        this._readyGlow.position.set(ox - 0.25, oy - 0.18, 0);
        scene.add(this._readyGlow);

        // Poke test indicator (small sphere for finger)
        var pokeGeo = new THREE.SphereGeometry(0.02, 6, 6);
        var pokeMat = new THREE.MeshBasicMaterial({
            color: 0xffccaa, transparent: true, opacity: 0
        });
        this._poke = new THREE.Mesh(pokeGeo, pokeMat);
        this._poke.visible = false;
        this._poke.position.set(ox - 0.25, oy - 0.15, 0);
        scene.add(this._poke);

        this._doughScale = 1.0;
        this._clothLifted = false;
    },
    _spawnCO2(x, y) {
        var c = this._co2[this._co2Idx % this._co2.length];
        this._co2Idx++;
        c.mesh.visible = true;
        c.mesh.position.set(
            x + (Math.random() - 0.5) * 0.15,
            y + (Math.random() - 0.5) * 0.08,
            (Math.random() - 0.5) * 0.06
        );
        c.vx = (Math.random() - 0.5) * 0.05;
        c.vy = 0.05 + Math.random() * 0.08;
        c.life = 0.5 + Math.random() * 0.5;
        c.maxLife = c.life;
        c.mesh.material.opacity = 0.4;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        var doughX = ox - 0.25;
        var doughBaseY = oy - 0.22;

        if (progress < 0.08) {
            // Phase 1: Dough and cloth appear
            var t = progress / 0.08;
            var ease = t * t;
            this._dough.material.opacity = ease * 0.8;
            this._cloth.material.opacity = ease * 0.4;
            this._warmGlow.material.opacity = ease * 0.1;
            model.position.set(ox + 0.2, oy, oz);
        } else if (progress < 0.45) {
            // Phase 2: Slow expansion under cloth, CO2 micro-bubbles
            var t2 = (progress - 0.08) / 0.37;
            this._dough.material.opacity = 0.8;
            this._cloth.material.opacity = 0.4;

            // Dough slowly expands
            this._doughScale = 1.0 + t2 * 0.4;
            this._dough.scale.set(
                this._doughScale,
                this._doughScale * 0.8,
                this._doughScale
            );
            this._dough.position.y = doughBaseY + t2 * 0.03;

            // Cloth rises with dough
            this._cloth.position.y = oy - 0.14 + t2 * 0.03;
            // Cloth deforms slightly (scales up)
            this._cloth.scale.setScalar(1 + t2 * 0.15);

            // CO2 micro-bubbles
            if (Math.random() < 0.04 + t2 * 0.06) {
                this._spawnCO2(doughX, doughBaseY + t2 * 0.02);
            }

            // Warmth glow
            this._warmGlow.material.opacity = 0.1 + t2 * 0.1 + Math.sin(time * 2) * 0.03;

            model.position.set(ox + 0.2, oy + Math.sin(time * 0.8) * 0.01, oz);
        } else if (progress < 0.60) {
            // Phase 3: Model lifts cloth to check
            var t3 = (progress - 0.45) / 0.15;
            this._doughScale = 1.4;
            this._dough.scale.set(1.4, 1.12, 1.4);
            this._dough.position.y = doughBaseY + 0.03;

            // Cloth lifts up
            this._cloth.position.y = oy - 0.11 + t3 * 0.15;
            this._cloth.material.opacity = 0.4 * (1 - t3 * 0.3);

            // CO2 escapes when cloth lifts
            if (Math.random() < 0.08) {
                this._spawnCO2(doughX, doughBaseY + 0.08);
            }

            // Model reaches to lift cloth
            model.position.set(ox + 0.2 - t3 * 0.1, oy + t3 * 0.02, oz);
            model.rotation.z = -t3 * 0.05;
        } else if (progress < 0.75) {
            // Phase 4: Finger poke test - dough springs back
            var t4 = (progress - 0.60) / 0.15;
            this._cloth.position.y = oy + 0.04;
            this._cloth.material.opacity = 0.28;

            // Poke test
            this._poke.visible = true;
            var pokePhase = t4 * 3; // 0 to 3
            if (pokePhase < 1) {
                // Finger approaches
                this._poke.material.opacity = pokePhase * 0.8;
                this._poke.position.set(doughX, oy - 0.1 - (1 - pokePhase) * 0.1, 0.05);
            } else if (pokePhase < 2) {
                // Finger pokes in - dough indents
                var pokeDepth = (pokePhase - 1);
                this._poke.position.set(doughX, oy - 0.1 - pokeDepth * 0.03, 0.05);
                // Dough deforms
                this._dough.scale.set(
                    1.4 + pokeDepth * 0.05,
                    1.12 - pokeDepth * 0.08,
                    1.4 + pokeDepth * 0.05
                );
            } else {
                // Finger withdraws - dough springs back!
                var springBack = (pokePhase - 2);
                this._poke.position.set(doughX, oy - 0.13 + springBack * 0.1, 0.05);
                this._poke.material.opacity = 0.8 * (1 - springBack);

                // Dough springs back with overshoot
                var spring = Math.sin(springBack * Math.PI * 2) * 0.03 * (1 - springBack);
                this._dough.scale.set(
                    1.4 - spring,
                    1.12 + spring * 1.5,
                    1.4 - spring
                );
            }

            model.position.set(ox + 0.1, oy + 0.02, oz);
            model.rotation.z = -0.05;
        } else if (progress < 0.88) {
            // Phase 5: Ready! Glow indicates success
            var t5 = (progress - 0.75) / 0.13;
            this._poke.visible = false;

            // Dough at perfect proofed size
            this._dough.scale.set(1.4, 1.12, 1.4);

            // Ready glow
            this._readyGlow.material.opacity = t5 * 0.3;
            this._readyGlow.scale.setScalar(1 + Math.sin(time * 3) * 0.1);

            // Warm glow peaks
            this._warmGlow.material.opacity = 0.2 + t5 * 0.1;

            // Cloth settles back gently
            this._cloth.position.y = oy + 0.04 - t5 * 0.08;
            this._cloth.material.opacity = 0.28 + t5 * 0.1;

            model.position.set(ox + 0.1 + t5 * 0.05, oy + 0.02 * (1 - t5), oz);
            model.rotation.z = -0.05 * (1 - t5);
        } else {
            // Phase 6: Fade out
            var t6 = (progress - 0.88) / 0.12;
            this._dough.material.opacity = 0.8 * (1 - t6);
            this._cloth.material.opacity = 0.38 * (1 - t6);
            this._warmGlow.material.opacity = 0.3 * (1 - t6);
            this._readyGlow.material.opacity = 0.3 * (1 - t6);

            model.position.set(ox + 0.15 * (1 - t6), oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update CO2
        for (var ci = 0; ci < this._co2.length; ci++) {
            var cp = this._co2[ci];
            if (cp.life <= 0) continue;
            cp.life -= delta;
            if (cp.life <= 0) { cp.mesh.visible = false; continue; }
            cp.mesh.position.x += cp.vx * delta;
            cp.mesh.position.y += cp.vy * delta;
            cp.mesh.position.x += Math.sin(time * 5 + ci * 2) * 0.001;
            var clr = cp.life / cp.maxLife;
            cp.mesh.material.opacity = clr * 0.35;
            cp.mesh.scale.setScalar(0.5 + (1 - clr) * 0.8);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._dough) { scene.remove(this._dough); this._dough.geometry.dispose(); this._dough.material.dispose(); }
        if (this._cloth) { scene.remove(this._cloth); this._cloth.geometry.dispose(); this._cloth.material.dispose(); }
        if (this._warmGlow) { scene.remove(this._warmGlow); this._warmGlow.geometry.dispose(); this._warmGlow.material.dispose(); }
        if (this._readyGlow) { scene.remove(this._readyGlow); this._readyGlow.geometry.dispose(); this._readyGlow.material.dispose(); }
        if (this._poke) { scene.remove(this._poke); this._poke.geometry.dispose(); this._poke.material.dispose(); }
        if (this._co2) { this._co2.forEach(function(c) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose(); }); }
        this._dough = this._cloth = this._warmGlow = this._readyGlow = this._poke = this._co2 = null;
    }
};
