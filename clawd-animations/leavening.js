export default {
    name: 'Leavening',
    label: 'leavening',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Surface / table
        var surfGeo = new THREE.BoxGeometry(0.6, 0.02, 0.3);
        var surfMat = new THREE.MeshBasicMaterial({
            color: 0x996644, transparent: true, opacity: 0
        });
        this._surface = new THREE.Mesh(surfGeo, surfMat);
        this._surface.position.set(ox - 0.2, oy - 0.32, 0);
        scene.add(this._surface);

        // Dough blob (sphere that expands)
        var doughGeo = new THREE.SphereGeometry(0.1, 14, 14);
        var doughMat = new THREE.MeshBasicMaterial({
            color: 0xf0deb0, transparent: true, opacity: 0
        });
        this._dough = new THREE.Mesh(doughGeo, doughMat);
        this._dough.position.set(ox - 0.2, oy - 0.25, 0);
        scene.add(this._dough);

        // Yeast particles (tiny yellow spheres activating inside)
        this._yeast = [];
        var yeastGeo = new THREE.SphereGeometry(0.01, 5, 5);
        for (var i = 0; i < 25; i++) {
            var yMat = new THREE.MeshBasicMaterial({
                color: 0xddcc44, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var yMesh = new THREE.Mesh(yeastGeo, yMat);
            yMesh.visible = false;
            scene.add(yMesh);
            this._yeast.push({
                mesh: yMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0
            });
        }
        this._yeastIdx = 0;

        // CO2 bubble particles
        this._co2 = [];
        var co2Geo = new THREE.SphereGeometry(0.015, 6, 6);
        for (var j = 0; j < 30; j++) {
            var cMat = new THREE.MeshBasicMaterial({
                color: 0xffffee, transparent: true, opacity: 0,
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

        // Air pocket indicators (small translucent spheres inside dough)
        this._pockets = [];
        var pocketGeo = new THREE.SphereGeometry(0.02, 6, 6);
        for (var k = 0; k < 10; k++) {
            var pMat = new THREE.MeshBasicMaterial({
                color: 0xfff8e0, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var pMesh = new THREE.Mesh(pocketGeo, pMat);
            pMesh.visible = false;
            var angle = Math.random() * Math.PI * 2;
            var dist = Math.random() * 0.06;
            pMesh.userData.offsetX = Math.cos(angle) * dist;
            pMesh.userData.offsetY = Math.sin(angle) * dist * 0.5 - 0.02;
            scene.add(pMesh);
            this._pockets.push(pMesh);
        }

        // Warm glow
        var glowGeo = new THREE.SphereGeometry(0.2, 10, 10);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xffcc66, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._warmGlow = new THREE.Mesh(glowGeo, glowMat);
        this._warmGlow.position.set(ox - 0.2, oy - 0.22, 0);
        scene.add(this._warmGlow);

        this._doughScale = 1.0;
    },
    _spawnYeast(x, y) {
        var y2 = this._yeast[this._yeastIdx % this._yeast.length];
        this._yeastIdx++;
        y2.mesh.visible = true;
        y2.mesh.position.set(
            x + (Math.random() - 0.5) * 0.12,
            y + (Math.random() - 0.5) * 0.08,
            (Math.random() - 0.5) * 0.06
        );
        y2.vx = (Math.random() - 0.5) * 0.15;
        y2.vy = (Math.random() - 0.5) * 0.15;
        y2.vz = (Math.random() - 0.5) * 0.1;
        y2.life = 0.4 + Math.random() * 0.4;
        y2.maxLife = y2.life;
        y2.mesh.material.opacity = 0.6;
    },
    _spawnCO2(x, y) {
        var c = this._co2[this._co2Idx % this._co2.length];
        this._co2Idx++;
        c.mesh.visible = true;
        c.mesh.position.set(
            x + (Math.random() - 0.5) * 0.15,
            y,
            (Math.random() - 0.5) * 0.08
        );
        c.vx = (Math.random() - 0.5) * 0.2;
        c.vy = 0.15 + Math.random() * 0.25;
        c.life = 0.5 + Math.random() * 0.5;
        c.maxLife = c.life;
        c.mesh.material.opacity = 0.5;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        var doughX = ox - 0.2;
        var doughY = oy - 0.25;

        if (progress < 0.08) {
            // Phase 1: Surface and dough appear
            var t = progress / 0.08;
            var ease = t * t;
            this._surface.material.opacity = ease * 0.6;
            this._dough.material.opacity = ease * 0.8;
            this._dough.scale.setScalar(0.8 + ease * 0.2);
            model.position.set(ox + 0.2, oy, oz);
        } else if (progress < 0.30) {
            // Phase 2: Yeast activates inside dough
            var t2 = (progress - 0.08) / 0.22;
            this._surface.material.opacity = 0.6;
            this._dough.material.opacity = 0.8;

            // Yeast sparkles inside
            if (Math.random() < 0.1 + t2 * 0.15) {
                this._spawnYeast(doughX, doughY);
            }

            // Slight warming glow
            this._warmGlow.material.opacity = t2 * 0.15;

            // Dough barely moving yet
            this._doughScale = 1.0 + t2 * 0.05;
            this._dough.scale.setScalar(this._doughScale);

            model.position.set(ox + 0.2, oy + Math.sin(time * 1.5) * 0.01, oz);
        } else if (progress < 0.60) {
            // Phase 3: CO2 bubbles push outward, dough expands
            var t3 = (progress - 0.30) / 0.30;

            // CO2 bubbles emerging
            if (Math.random() < 0.08 + t3 * 0.12) {
                this._spawnCO2(doughX, doughY - 0.02);
            }

            // Yeast continues
            if (Math.random() < 0.06) {
                this._spawnYeast(doughX, doughY);
            }

            // Dough expands slowly
            this._doughScale = 1.05 + t3 * 0.45;
            this._dough.scale.set(
                this._doughScale,
                this._doughScale * 0.85,
                this._doughScale
            );
            this._dough.position.y = doughY + t3 * 0.04;

            // Air pockets become visible
            for (var pi = 0; pi < this._pockets.length; pi++) {
                var pocket = this._pockets[pi];
                var pocketAppear = Math.max(0, (t3 - pi / this._pockets.length * 0.5) / 0.5);
                if (pocketAppear > 0) {
                    pocket.visible = true;
                    pocket.position.set(
                        doughX + pocket.userData.offsetX * this._doughScale,
                        this._dough.position.y + pocket.userData.offsetY * this._doughScale,
                        0
                    );
                    pocket.material.opacity = pocketAppear * 0.25;
                    pocket.scale.setScalar(0.5 + pocketAppear * 0.8);
                }
            }

            // Warm glow intensifies
            this._warmGlow.material.opacity = 0.15 + t3 * 0.15 + Math.sin(time * 3) * 0.05;
            this._warmGlow.scale.setScalar(1 + t3 * 0.5);

            // Rising motion
            this._dough.position.y = doughY + t3 * 0.06;

            // Model watches in growing awe
            model.position.set(ox + 0.2, oy + t3 * 0.02, oz);
            model.rotation.z = Math.sin(time * 1.2) * 0.03;
        } else if (progress < 0.80) {
            // Phase 4: Full rise, model watches in awe
            var t4 = (progress - 0.60) / 0.20;

            // Dough at full size
            this._doughScale = 1.5 + t4 * 0.15;
            this._dough.scale.set(
                this._doughScale,
                this._doughScale * 0.8,
                this._doughScale
            );
            this._dough.position.y = doughY + 0.06 + t4 * 0.02;

            // Fewer but larger CO2 bubbles
            if (Math.random() < 0.04) {
                this._spawnCO2(doughX, doughY + 0.05);
            }

            // Air pockets all visible, gently pulsing
            for (var pi2 = 0; pi2 < this._pockets.length; pi2++) {
                var p2 = this._pockets[pi2];
                p2.visible = true;
                p2.position.set(
                    doughX + p2.userData.offsetX * this._doughScale,
                    this._dough.position.y + p2.userData.offsetY * this._doughScale,
                    0
                );
                p2.material.opacity = 0.25 + Math.sin(time * 2 + pi2) * 0.05;
                p2.scale.setScalar(1.3 + Math.sin(time * 3 + pi2 * 0.5) * 0.2);
            }

            // Warm glow
            this._warmGlow.material.opacity = 0.3 + Math.sin(time * 2) * 0.05;

            // Model in awe - slight lean back
            model.position.set(ox + 0.2 + t4 * 0.02, oy + 0.02 + t4 * 0.01, oz);
            model.rotation.z = t4 * 0.04;
            // Slight scale pulse of awe
            var awePulse = 1 + Math.sin(time * 4) * 0.01;
            model.scale.set(
                this._origScale.x * awePulse,
                this._origScale.y * awePulse,
                this._origScale.z * awePulse
            );
        } else {
            // Phase 5: Fade out
            var t5 = (progress - 0.80) / 0.20;
            this._surface.material.opacity = 0.6 * (1 - t5);
            this._dough.material.opacity = 0.8 * (1 - t5);
            this._warmGlow.material.opacity = 0.3 * (1 - t5);
            for (var pi3 = 0; pi3 < this._pockets.length; pi3++) {
                this._pockets[pi3].material.opacity = 0.25 * (1 - t5);
            }

            model.position.set(
                ox + (0.22) * (1 - t5),
                oy + 0.03 * (1 - t5),
                oz
            );
            model.rotation.z = 0.04 * (1 - t5);
            model.scale.copy(this._origScale);
        }

        // Update yeast particles
        for (var yi = 0; yi < this._yeast.length; yi++) {
            var yp = this._yeast[yi];
            if (yp.life <= 0) continue;
            yp.life -= delta;
            if (yp.life <= 0) { yp.mesh.visible = false; continue; }
            yp.mesh.position.x += yp.vx * delta;
            yp.mesh.position.y += yp.vy * delta;
            yp.mesh.position.z += yp.vz * delta;
            var ylr = yp.life / yp.maxLife;
            yp.mesh.material.opacity = ylr * 0.5;
            yp.mesh.scale.setScalar(0.5 + (1 - ylr) * 0.8);
        }

        // Update CO2 bubbles
        for (var ci = 0; ci < this._co2.length; ci++) {
            var cp = this._co2[ci];
            if (cp.life <= 0) continue;
            cp.life -= delta;
            if (cp.life <= 0) { cp.mesh.visible = false; continue; }
            cp.mesh.position.x += cp.vx * delta;
            cp.mesh.position.y += cp.vy * delta;
            cp.mesh.position.x += Math.sin(time * 6 + ci) * 0.002;
            var clr = cp.life / cp.maxLife;
            cp.mesh.material.opacity = clr * 0.4;
            cp.mesh.scale.setScalar(0.5 + (1 - clr) * 1.0);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._surface) { scene.remove(this._surface); this._surface.geometry.dispose(); this._surface.material.dispose(); }
        if (this._dough) { scene.remove(this._dough); this._dough.geometry.dispose(); this._dough.material.dispose(); }
        if (this._warmGlow) { scene.remove(this._warmGlow); this._warmGlow.geometry.dispose(); this._warmGlow.material.dispose(); }
        if (this._yeast) { this._yeast.forEach(function(y) { scene.remove(y.mesh); y.mesh.geometry.dispose(); y.mesh.material.dispose(); }); }
        if (this._co2) { this._co2.forEach(function(c) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose(); }); }
        if (this._pockets) { this._pockets.forEach(function(p) { scene.remove(p); p.geometry.dispose(); p.material.dispose(); }); }
        this._surface = this._dough = this._warmGlow = this._yeast = this._co2 = this._pockets = null;
    }
};
