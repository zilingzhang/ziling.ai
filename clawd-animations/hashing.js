export default {
    name: 'Hashing',
    label: 'hashing',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Input data cube (large, colored)
        var inputGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
        var inputMat = new THREE.MeshBasicMaterial({
            color: 0x44ff88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._inputCube = new THREE.Mesh(inputGeo, inputMat);
        this._inputCube.position.set(ox - 0.5, oy, 0);
        scene.add(this._inputCube);

        // Hash function grinder (rotating torus with teeth)
        var grinderGeo = new THREE.TorusGeometry(0.15, 0.03, 8, 12);
        var grinderMat = new THREE.MeshBasicMaterial({
            color: 0x22cc66, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._grinder = new THREE.Mesh(grinderGeo, grinderMat);
        this._grinder.position.set(ox, oy, 0);
        scene.add(this._grinder);

        // Inner grinder ring
        var innerGeo = new THREE.TorusGeometry(0.08, 0.02, 6, 8);
        var innerMat = new THREE.MeshBasicMaterial({
            color: 0x33dd77, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._innerGrinder = new THREE.Mesh(innerGeo, innerMat);
        this._innerGrinder.position.set(ox, oy, 0.02);
        scene.add(this._innerGrinder);

        // Teeth (small boxes around the torus)
        this._teeth = [];
        var toothGeo = new THREE.BoxGeometry(0.025, 0.04, 0.02);
        for (var i = 0; i < 8; i++) {
            var tMat = new THREE.MeshBasicMaterial({
                color: 0x44ee88, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var tooth = new THREE.Mesh(toothGeo, tMat);
            scene.add(tooth);
            this._teeth.push({ mesh: tooth, angle: (i / 8) * Math.PI * 2 });
        }

        // Chaotic mixing particles
        this._mixParticles = [];
        var mixGeo = new THREE.SphereGeometry(0.015, 4, 4);
        for (var j = 0; j < 25; j++) {
            var mMat = new THREE.MeshBasicMaterial({
                color: j % 4 === 0 ? 0x22ff66 : (j % 4 === 1 ? 0x00cc44 : (j % 4 === 2 ? 0x44ffaa : 0x11aa33)),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var mix = new THREE.Mesh(mixGeo, mMat);
            mix.visible = false;
            scene.add(mix);
            this._mixParticles.push({
                mesh: mix, life: 0, maxLife: 0,
                angle: 0, radius: 0, speed: 0, radialSpeed: 0
            });
        }
        this._mixIdx = 0;

        // Output hash cube (small, different color)
        var outputGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        var outputMat = new THREE.MeshBasicMaterial({
            color: 0xff4488, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._outputCube = new THREE.Mesh(outputGeo, outputMat);
        this._outputCube.position.set(ox + 0.5, oy, 0);
        scene.add(this._outputCube);

        // Collision flash (rare event)
        var flashGeo = new THREE.SphereGeometry(0.2, 10, 10);
        var flashMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._collisionFlash = new THREE.Mesh(flashGeo, flashMat);
        this._collisionFlash.position.set(ox + 0.5, oy, 0);
        scene.add(this._collisionFlash);

        // Second input cube (for collision demo)
        var input2Geo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
        var input2Mat = new THREE.MeshBasicMaterial({
            color: 0x8844ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._inputCube2 = new THREE.Mesh(input2Geo, input2Mat);
        this._inputCube2.position.set(ox - 0.5, oy + 0.25, 0);
        scene.add(this._inputCube2);

        this._grinderSpeed = 0;
    },
    _spawnMixParticle(ox, oy) {
        var m = this._mixParticles[this._mixIdx % this._mixParticles.length];
        this._mixIdx++;
        m.mesh.visible = true;
        m.mesh.position.set(ox, oy, 0.01);
        m.angle = Math.random() * Math.PI * 2;
        m.radius = 0.02 + Math.random() * 0.1;
        m.speed = 3 + Math.random() * 5;
        m.radialSpeed = (Math.random() - 0.5) * 2;
        m.life = 0.3 + Math.random() * 0.4;
        m.maxLife = m.life;
        m.mesh.material.opacity = 0.7;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        // Update grinder rotation and teeth
        this._grinderSpeed = progress < 0.1 ? 0 : (progress < 0.7 ? 3 + progress * 5 : 3);
        this._grinder.rotation.z += this._grinderSpeed * delta;
        this._innerGrinder.rotation.z -= this._grinderSpeed * delta * 1.3;

        for (var ti = 0; ti < this._teeth.length; ti++) {
            var tooth = this._teeth[ti];
            var tAngle = tooth.angle + this._grinder.rotation.z;
            tooth.mesh.position.set(
                ox + Math.cos(tAngle) * 0.15,
                oy + Math.sin(tAngle) * 0.15,
                0.01
            );
            tooth.mesh.rotation.z = tAngle;
        }

        if (progress < 0.10) {
            // Phase 1: Input cube and grinder appear
            var t = progress / 0.10;
            this._inputCube.material.opacity = t * 0.7;
            this._inputCube.rotation.y = time;
            this._grinder.material.opacity = t * 0.5;
            this._innerGrinder.material.opacity = t * 0.3;
            for (var i = 0; i < this._teeth.length; i++) {
                this._teeth[i].mesh.material.opacity = t * 0.5;
            }
            model.position.set(ox, oy + 0.25, oz);
        } else if (progress < 0.35) {
            // Phase 2: Input cube feeds into grinder
            var t2 = (progress - 0.10) / 0.25;

            // Input cube moves toward grinder and shrinks
            this._inputCube.position.x = ox - 0.5 + t2 * 0.4;
            this._inputCube.scale.setScalar(1 - t2 * 0.5);
            this._inputCube.material.opacity = 0.7;
            this._inputCube.rotation.y = time * 2;
            this._inputCube.rotation.x = time * 1.5;

            this._grinder.material.opacity = 0.5 + t2 * 0.2;
            this._innerGrinder.material.opacity = 0.3 + t2 * 0.2;
            for (var j = 0; j < this._teeth.length; j++) {
                this._teeth[j].mesh.material.opacity = 0.5 + t2 * 0.2;
            }

            model.position.set(ox, oy + 0.25, oz);
        } else if (progress < 0.60) {
            // Phase 3: Chaotic internal mixing
            var t3 = (progress - 0.35) / 0.25;

            // Input cube disappears into grinder
            this._inputCube.material.opacity = Math.max(0, 0.7 - t3 * 2);
            this._inputCube.scale.setScalar(Math.max(0.01, 0.5 - t3 * 0.5));

            // Mixing particles
            if (Math.random() < 0.3 + t3 * 0.3) {
                this._spawnMixParticle(ox, oy);
            }

            // Grinder glow intensifies
            this._grinder.material.opacity = 0.7 + Math.sin(time * 8) * 0.1;
            this._innerGrinder.material.opacity = 0.5 + Math.sin(time * 10) * 0.1;

            model.position.set(ox, oy + 0.25 + Math.sin(time * 3) * 0.01, oz);
        } else if (progress < 0.78) {
            // Phase 4: Output hash emerges
            var t4 = (progress - 0.60) / 0.18;

            // Output cube appears and moves right
            this._outputCube.material.opacity = t4 * 0.8;
            this._outputCube.position.x = ox + 0.15 + t4 * 0.35;
            this._outputCube.scale.setScalar(0.5 + t4 * 0.5);
            this._outputCube.rotation.y = time * 2;
            this._outputCube.rotation.x = time * 1.5;

            // Grinder slows
            this._grinder.material.opacity = 0.7 - t4 * 0.2;

            if (Math.random() < 0.1 * (1 - t4)) {
                this._spawnMixParticle(ox, oy);
            }

            model.position.set(ox, oy + 0.25, oz);
        } else if (progress < 0.90) {
            // Phase 5: Collision detection (rare flash - two inputs, same output)
            var t5 = (progress - 0.78) / 0.12;

            this._outputCube.material.opacity = 0.8;
            this._outputCube.position.x = ox + 0.5;
            this._outputCube.rotation.y = time * 2;

            // Second input briefly appears
            this._inputCube2.material.opacity = Math.sin(t5 * Math.PI) * 0.4;
            this._inputCube2.rotation.y = time * 2;
            this._inputCube2.position.x = ox - 0.5 + t5 * 0.3;

            // Collision flash at midpoint
            var flashI = Math.sin(t5 * Math.PI);
            this._collisionFlash.material.opacity = flashI * 0.3;
            this._collisionFlash.scale.setScalar(0.5 + flashI * 1.5);

            // Grinder fades
            this._grinder.material.opacity = 0.5 * (1 - t5);
            this._innerGrinder.material.opacity = 0.3 * (1 - t5);
            for (var k = 0; k < this._teeth.length; k++) {
                this._teeth[k].mesh.material.opacity = 0.5 * (1 - t5);
            }

            model.position.set(ox, oy + 0.25, oz);
        } else {
            // Phase 6: Settle
            var t6 = (progress - 0.90) / 0.10;
            this._outputCube.material.opacity = 0.8 * (1 - t6);
            this._inputCube2.material.opacity = 0;
            this._collisionFlash.material.opacity = 0;
            this._grinder.material.opacity = 0;
            this._innerGrinder.material.opacity = 0;

            model.position.set(ox, oy + 0.25 * (1 - t6), oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update mix particles
        for (var mi = 0; mi < this._mixParticles.length; mi++) {
            var mp = this._mixParticles[mi];
            if (mp.life <= 0) continue;
            mp.life -= delta;
            if (mp.life <= 0) { mp.mesh.visible = false; continue; }
            mp.angle += mp.speed * delta;
            mp.radius += mp.radialSpeed * delta * 0.1;
            mp.radius = Math.max(0.01, Math.min(0.15, mp.radius));
            mp.mesh.position.x = ox + Math.cos(mp.angle) * mp.radius;
            mp.mesh.position.y = oy + Math.sin(mp.angle) * mp.radius;
            var lr = mp.life / mp.maxLife;
            mp.mesh.material.opacity = lr * 0.6;
            mp.mesh.scale.setScalar(0.5 + (1 - lr) * 0.5);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._inputCube) { scene.remove(this._inputCube); this._inputCube.geometry.dispose(); this._inputCube.material.dispose(); }
        if (this._inputCube2) { scene.remove(this._inputCube2); this._inputCube2.geometry.dispose(); this._inputCube2.material.dispose(); }
        if (this._grinder) { scene.remove(this._grinder); this._grinder.geometry.dispose(); this._grinder.material.dispose(); }
        if (this._innerGrinder) { scene.remove(this._innerGrinder); this._innerGrinder.geometry.dispose(); this._innerGrinder.material.dispose(); }
        if (this._teeth) { this._teeth.forEach(function(t) { scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose(); }); }
        if (this._mixParticles) { this._mixParticles.forEach(function(m) { scene.remove(m.mesh); m.mesh.geometry.dispose(); m.mesh.material.dispose(); }); }
        if (this._outputCube) { scene.remove(this._outputCube); this._outputCube.geometry.dispose(); this._outputCube.material.dispose(); }
        if (this._collisionFlash) { scene.remove(this._collisionFlash); this._collisionFlash.geometry.dispose(); this._collisionFlash.material.dispose(); }
        this._inputCube = this._inputCube2 = this._grinder = this._innerGrinder = this._teeth = this._mixParticles = this._outputCube = this._collisionFlash = null;
    }
};
