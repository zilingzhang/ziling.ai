export default {
    name: 'Ideating',
    label: 'ideating',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Light bulb shapes: sphere head + cone base
        this._bulbs = [];
        var bulbPositions = [
            { x: -0.25, y: 0.15, size: 0.8 },
            { x: 0.1, y: 0.2, size: 0.7 },
            { x: -0.1, y: 0.25, size: 0.9 },
            { x: 0.2, y: 0.1, size: 0.6 },
            { x: -0.35, y: 0.05, size: 0.75 },
            { x: 0.3, y: 0.18, size: 0.65 },
            { x: -0.05, y: 0.08, size: 1.0 },
            { x: 0.15, y: -0.05, size: 0.85 }
        ];
        for (var bi = 0; bi < bulbPositions.length; bi++) {
            // Bulb sphere
            var bGeo = new THREE.SphereGeometry(0.03, 10, 10);
            var bMat = new THREE.MeshBasicMaterial({
                color: 0xffee88, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var bulbHead = new THREE.Mesh(bGeo, bMat);
            bulbHead.position.set(ox + bulbPositions[bi].x, oy + bulbPositions[bi].y, 0.02);
            bulbHead.visible = false;
            scene.add(bulbHead);

            // Bulb cone base
            var cGeo = new THREE.ConeGeometry(0.015, 0.02, 6);
            var cMat = new THREE.MeshBasicMaterial({
                color: 0xaaaaaa, transparent: true, opacity: 0
            });
            var bulbBase = new THREE.Mesh(cGeo, cMat);
            bulbBase.position.set(ox + bulbPositions[bi].x, oy + bulbPositions[bi].y - 0.035, 0.02);
            bulbBase.rotation.x = Math.PI;
            bulbBase.visible = false;
            scene.add(bulbBase);

            this._bulbs.push({
                head: bulbHead,
                base: bulbBase,
                x: ox + bulbPositions[bi].x,
                y: oy + bulbPositions[bi].y,
                size: bulbPositions[bi].size,
                appearTime: 0.10 + bi * 0.06,
                state: 'off', // off, dim, bright, fizzle, best
                brightness: 0,
                fizzleTime: 0
            });
        }

        // The "best idea" is index 6 (largest size, central position)
        this._bestIdx = 6;

        // Halo ring for the best idea
        var haloGeo = new THREE.TorusGeometry(0.06, 0.004, 8, 24);
        var haloMat = new THREE.MeshBasicMaterial({
            color: 0xffffaa, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._halo = new THREE.Mesh(haloGeo, haloMat);
        this._halo.position.set(this._bulbs[this._bestIdx].x, this._bulbs[this._bestIdx].y, 0.03);
        scene.add(this._halo);

        // Brainstorm energy particles
        this._sparks = [];
        var sparkGeo = new THREE.SphereGeometry(0.007, 4, 4);
        for (var si = 0; si < 25; si++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: si % 3 === 0 ? 0xffffff : (si % 3 === 1 ? 0xffee66 : 0xffcc44),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spark = new THREE.Mesh(sparkGeo, sMat);
            spark.visible = false;
            scene.add(spark);
            this._sparks.push({
                mesh: spark, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._sparkIdx = 0;

        // Overall glow
        var glowGeo = new THREE.SphereGeometry(0.3, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xffee88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glow = new THREE.Mesh(glowGeo, glowMat);
        this._glow.position.set(this._bulbs[this._bestIdx].x, this._bulbs[this._bestIdx].y, -0.05);
        scene.add(this._glow);
    },
    _emitSpark(x, y) {
        var s = this._sparks[this._sparkIdx % this._sparks.length];
        this._sparkIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x, y, 0.03);
        var a = Math.random() * Math.PI * 2;
        s.vx = Math.cos(a) * (0.3 + Math.random() * 0.5);
        s.vy = Math.sin(a) * (0.3 + Math.random() * 0.5);
        s.life = 0.3 + Math.random() * 0.3;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.8;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        if (progress < 0.08) {
            // Phase 1: Setup
            model.position.set(ox, oy, oz);
        } else if (progress < 0.55) {
            // Phase 2: Bulbs pop in one by one, some dim/fizzle
            var t2 = (progress - 0.08) / 0.47;

            for (var bi = 0; bi < this._bulbs.length; bi++) {
                var bulb = this._bulbs[bi];
                var bulbProgress = (progress - bulb.appearTime);
                if (bulbProgress < 0) continue;

                bulb.head.visible = true;
                bulb.base.visible = true;

                // Pop-in animation
                var popT = Math.min(1, bulbProgress / 0.04);
                var popScale = popT > 0.8 ? 1.0 : popT * 1.2;

                // Determine state based on bulb index
                if (bi === this._bestIdx) {
                    // Best idea stays and grows
                    bulb.state = 'bright';
                    bulb.brightness = Math.min(1, bulbProgress / 0.15);
                } else if (bi % 3 === 0 && bulbProgress > 0.12) {
                    // Some fizzle out
                    bulb.state = 'fizzle';
                    var fizzleT = (bulbProgress - 0.12) / 0.08;
                    bulb.brightness = Math.max(0, 1 - fizzleT);
                    if (fizzleT > 0.5 && fizzleT < 0.7 && Math.random() < 0.2) {
                        this._emitSpark(bulb.x, bulb.y);
                    }
                } else if (bi % 3 === 1) {
                    // Some stay dim
                    bulb.state = 'dim';
                    bulb.brightness = 0.3 + Math.sin(time * 2 + bi) * 0.1;
                } else {
                    // Others glow moderately
                    bulb.state = 'bright';
                    bulb.brightness = 0.5 + Math.sin(time * 3 + bi * 0.7) * 0.15;
                }

                bulb.head.material.opacity = bulb.brightness * 0.7 * popScale;
                bulb.base.material.opacity = bulb.brightness * 0.4 * popScale;
                bulb.head.scale.setScalar(bulb.size * popScale);
                bulb.base.scale.setScalar(bulb.size * popScale);

                // Color based on brightness
                var warmth = bulb.brightness;
                bulb.head.material.color.setRGB(1, 0.9 + warmth * 0.1, 0.5 + warmth * 0.3);
            }

            model.position.set(ox, oy + Math.sin(time * 1.5) * 0.005, oz);
        } else if (progress < 0.78) {
            // Phase 3: Best idea grows largest with expanding halo
            var t3 = (progress - 0.55) / 0.23;
            var bestBulb = this._bulbs[this._bestIdx];

            for (var bi2 = 0; bi2 < this._bulbs.length; bi2++) {
                var b2 = this._bulbs[bi2];
                if (bi2 === this._bestIdx) {
                    // Best idea grows
                    var growScale = b2.size * (1 + t3 * 1.5);
                    b2.head.scale.setScalar(growScale);
                    b2.base.scale.setScalar(growScale);
                    b2.head.material.opacity = 0.8 + Math.sin(time * 3) * 0.15;
                    b2.head.material.color.setRGB(1, 1, 0.8);
                } else {
                    // Others dim further
                    var dimFactor = Math.max(0, b2.brightness * (1 - t3 * 0.7));
                    b2.head.material.opacity = dimFactor * 0.5;
                    b2.base.material.opacity = dimFactor * 0.3;
                }
            }

            // Halo appears and expands
            this._halo.material.opacity = t3 * 0.5;
            this._halo.scale.setScalar(1 + t3 * 2);

            // Brainstorm sparks
            if (Math.random() < 0.08 + t3 * 0.1) {
                this._emitSpark(bestBulb.x, bestBulb.y);
            }

            this._glow.material.opacity = t3 * 0.12;
            this._glow.scale.setScalar(1 + t3 * 0.5);

            model.position.set(ox, oy + Math.sin(time * 1.2) * 0.003, oz);
        } else if (progress < 0.90) {
            // Phase 4: Eureka moment - bright flash
            var t4 = (progress - 0.78) / 0.12;
            var flash = Math.sin(t4 * Math.PI);
            var bestB = this._bulbs[this._bestIdx];

            bestB.head.material.opacity = 0.9 + flash * 0.1;
            bestB.head.scale.setScalar(bestB.size * 2.5 + flash * 0.5);
            bestB.head.material.color.setRGB(1, 1, 0.9 + flash * 0.1);

            this._halo.material.opacity = 0.5 + flash * 0.3;
            this._halo.scale.setScalar(3 + flash * 1.5);

            this._glow.material.opacity = 0.12 + flash * 0.1;
            this._glow.scale.setScalar(1.5 + flash * 0.5);

            // Lots of sparks
            if (Math.random() < 0.2) {
                this._emitSpark(bestB.x, bestB.y);
            }

            model.position.set(ox, oy, oz);
        } else {
            // Phase 5: Fade out
            var t5 = (progress - 0.90) / 0.10;
            var fadeOut = 1 - t5;
            for (var bi3 = 0; bi3 < this._bulbs.length; bi3++) {
                this._bulbs[bi3].head.material.opacity *= fadeOut;
                this._bulbs[bi3].base.material.opacity *= fadeOut;
            }
            this._halo.material.opacity *= fadeOut;
            this._glow.material.opacity *= fadeOut;
            model.position.set(ox, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update sparks
        for (var si = 0; si < this._sparks.length; si++) {
            var sp = this._sparks[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            var lr = sp.life / sp.maxLife;
            sp.mesh.material.opacity = lr * 0.7;
            sp.mesh.scale.setScalar(0.5 + (1 - lr) * 0.5);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._bulbs) {
            this._bulbs.forEach(function(b) {
                scene.remove(b.head); b.head.geometry.dispose(); b.head.material.dispose();
                scene.remove(b.base); b.base.geometry.dispose(); b.base.material.dispose();
            });
        }
        if (this._halo) { scene.remove(this._halo); this._halo.geometry.dispose(); this._halo.material.dispose(); }
        if (this._sparks) {
            this._sparks.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); });
        }
        if (this._glow) { scene.remove(this._glow); this._glow.geometry.dispose(); this._glow.material.dispose(); }
        this._bulbs = this._halo = this._sparks = this._glow = null;
    }
};
