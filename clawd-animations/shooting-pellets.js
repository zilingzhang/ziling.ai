export default {
    name: 'Shooting Pellets',
    label: 'blasting',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Pellet pool
        this._pellets = [];
        var pelletGeo = new THREE.SphereGeometry(0.04, 6, 6);
        var pelletColors = [0xff3366, 0x33ccff, 0xffcc00, 0x66ff66, 0xff6600,
                            0xcc33ff, 0x00ffcc, 0xff0066, 0x3366ff, 0xffff33,
                            0xff9900, 0x00ff66, 0xff33cc, 0x9966ff, 0x33ffcc,
                            0xff4444, 0x44aaff, 0xffdd00, 0x44ff44, 0xcc6600];
        for (var i = 0; i < 40; i++) {
            var pMat = new THREE.MeshBasicMaterial({
                color: pelletColors[i % pelletColors.length],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var pellet = new THREE.Mesh(pelletGeo, pMat);
            pellet.visible = false;
            scene.add(pellet);
            this._pellets.push({
                mesh: pellet, active: false,
                vx: 0, vy: 0, vz: 0,
                life: 0, maxLife: 0
            });
        }
        this._pelletIdx = 0;

        // Muzzle flash
        var flashGeo = new THREE.SphereGeometry(0.1, 8, 8);
        var flashMat = new THREE.MeshBasicMaterial({
            color: 0xffffaa, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
        this._muzzleFlash.visible = false;
        scene.add(this._muzzleFlash);

        // Spark particles on impact (left wall)
        this._sparks = [];
        var sparkGeo = new THREE.SphereGeometry(0.02, 4, 4);
        for (var s = 0; s < 20; s++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: s % 2 === 0 ? 0xffaa33 : 0xffffff,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spark = new THREE.Mesh(sparkGeo, sMat);
            spark.visible = false;
            scene.add(spark);
            this._sparks.push({ mesh: spark, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
        }
        this._sparkIdx = 0;

        this._lastShot = 0;
        this._burstCount = 0;
    },
    _firePellet(fromX, fromY, angle, speed, spread) {
        var p = this._pellets[this._pelletIdx % this._pellets.length];
        this._pelletIdx++;
        p.active = true;
        p.mesh.visible = true;
        p.mesh.position.set(fromX, fromY, 0);
        var a = angle + (Math.random() - 0.5) * spread;
        p.vx = Math.cos(a) * speed;
        p.vy = Math.sin(a) * speed;
        p.vz = (Math.random() - 0.5) * 0.8;
        p.life = 0.5 + Math.random() * 0.3;
        p.maxLife = p.life;
        p.mesh.material.opacity = 1.0;
        p.mesh.scale.setScalar(0.6 + Math.random() * 0.6);
    },
    _spawnSparks(x, y) {
        for (var i = 0; i < 3; i++) {
            var s = this._sparks[this._sparkIdx % this._sparks.length];
            this._sparkIdx++;
            s.mesh.visible = true;
            s.mesh.position.set(x, y, 0);
            s.vx = 1.0 + Math.random() * 2.0;
            s.vy = (Math.random() - 0.5) * 3.0;
            s.vz = (Math.random() - 0.5) * 1.0;
            s.life = 0.2 + Math.random() * 0.2;
            s.maxLife = s.life;
            s.mesh.material.opacity = 1.0;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var shootX = orig.x - 0.2;
        var shootY = orig.y + 0.3;
        var aimAngle = Math.PI; // fire leftward

        if (progress < 0.08) {
            // Wind-up: model leans back
            var t = progress / 0.08;
            model.position.x = orig.x + t * 0.05;
            model.rotation.z = -t * 0.12;
        } else if (progress < 0.75) {
            // Main firing phase with bursts
            var t2 = (progress - 0.08) / 0.67;

            // Firing rate increases over time
            var fireRate = 0.12 - t2 * 0.06;
            if (time - this._lastShot > fireRate) {
                // Fire 2-4 pellets per burst
                var burstSize = 2 + Math.floor(t2 * 2);
                var spread = 0.4 + t2 * 0.3;
                var speed = 4.0 + t2 * 3.0;
                for (var i = 0; i < burstSize; i++) {
                    this._firePellet(shootX, shootY + (Math.random() - 0.5) * 0.15, aimAngle, speed, spread);
                }
                this._lastShot = time;
                this._burstCount++;

                // Muzzle flash
                this._muzzleFlash.visible = true;
                this._muzzleFlash.position.set(shootX - 0.1, shootY, 0.1);
                this._muzzleFlash.material.opacity = 0.8;
                this._muzzleFlash.scale.setScalar(0.5 + Math.random() * 0.5);

                // Recoil
                model.position.x = orig.x + 0.06;
                model.rotation.z = (Math.random() - 0.5) * 0.1;
            }

            // Muzzle flash fades
            if (this._muzzleFlash.material.opacity > 0) {
                this._muzzleFlash.material.opacity -= delta * 8;
                if (this._muzzleFlash.material.opacity <= 0) this._muzzleFlash.visible = false;
            }

            // Model returns from recoil
            model.position.x += (orig.x - model.position.x) * delta * 10;
            model.rotation.z += (0 - model.rotation.z) * delta * 8;

            // Bob slightly
            model.position.y = orig.y + Math.abs(Math.sin(time * 5)) * 0.03;
        } else if (progress < 0.88) {
            // Final big burst
            var t3 = (progress - 0.75) / 0.13;
            if (t3 < 0.3 && time - this._lastShot > 0.04) {
                for (var j = 0; j < 5; j++) {
                    this._firePellet(shootX, shootY + (Math.random() - 0.5) * 0.2, aimAngle, 6.0, 0.8);
                }
                this._lastShot = time;
                this._muzzleFlash.visible = true;
                this._muzzleFlash.position.set(shootX - 0.1, shootY, 0.1);
                this._muzzleFlash.material.opacity = 1.0;
                this._muzzleFlash.scale.setScalar(1.0);
                model.position.x = orig.x + 0.08;
                model.rotation.z = (Math.random() - 0.5) * 0.15;
            }
            if (this._muzzleFlash.material.opacity > 0) {
                this._muzzleFlash.material.opacity -= delta * 6;
                if (this._muzzleFlash.material.opacity <= 0) this._muzzleFlash.visible = false;
            }
            model.position.x += (orig.x - model.position.x) * delta * 8;
            model.rotation.z += (0 - model.rotation.z) * delta * 6;
        } else {
            // Cool down
            var t4 = (progress - 0.88) / 0.12;
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
            this._muzzleFlash.visible = false;
        }

        // Update pellets
        var wallX = orig.x - 3.5;
        for (var pi = 0; pi < this._pellets.length; pi++) {
            var pel = this._pellets[pi];
            if (!pel.active) continue;
            pel.life -= delta;
            if (pel.life <= 0) { pel.active = false; pel.mesh.visible = false; continue; }
            pel.mesh.position.x += pel.vx * delta;
            pel.mesh.position.y += pel.vy * delta;
            pel.mesh.position.z += pel.vz * delta;
            pel.vz *= 0.92;
            var lr = pel.life / pel.maxLife;
            pel.mesh.material.opacity = lr;

            // Impact on left edge
            if (pel.mesh.position.x < wallX) {
                this._spawnSparks(wallX, pel.mesh.position.y);
                pel.active = false;
                pel.mesh.visible = false;
            }
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
            sp.vy -= 5 * delta;
            sp.mesh.material.opacity = sp.life / sp.maxLife;
            sp.mesh.scale.setScalar(sp.life / sp.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._pellets) { this._pellets.forEach(function(p) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }); this._pellets = null; }
        if (this._muzzleFlash) { scene.remove(this._muzzleFlash); this._muzzleFlash.geometry.dispose(); this._muzzleFlash.material.dispose(); this._muzzleFlash = null; }
        if (this._sparks) { this._sparks.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); this._sparks = null; }
    }
};
