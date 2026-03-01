export default {
    name: 'Moonwalking',
    label: 'moonwalking',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Spotlight disc on the ground
        var spotGeo = new THREE.CircleGeometry(0.25, 24);
        var spotMat = new THREE.MeshBasicMaterial({
            color: 0xffee66, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        });
        this._spotlight = new THREE.Mesh(spotGeo, spotMat);
        this._spotlight.rotation.x = -Math.PI / 2;
        this._spotlight.position.set(this._origPos.x, this._origPos.y - 0.2, this._origPos.z);
        scene.add(this._spotlight);

        // Sparkle trail particles
        this._sparkles = [];
        var spkGeo = new THREE.SphereGeometry(0.015, 4, 4);
        for (var i = 0; i < 20; i++) {
            var colors = [0xffffff, 0xffee88, 0xaaddff, 0xffaaff, 0x88ffee];
            var sMat = new THREE.MeshBasicMaterial({
                color: colors[i % colors.length], transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spk = new THREE.Mesh(spkGeo, sMat);
            spk.visible = false;
            scene.add(spk);
            this._sparkles.push({ mesh: spk, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
        }
        this._spkIdx = 0;
        this._lastSparkle = 0;
    },
    _emitSparkle(x, y) {
        for (var i = 0; i < 2; i++) {
            var s = this._sparkles[this._spkIdx % this._sparkles.length];
            this._spkIdx++;
            s.mesh.visible = true;
            s.mesh.position.set(x + (Math.random() - 0.5) * 0.1, y - 0.15 + Math.random() * 0.05, (Math.random() - 0.5) * 0.1);
            s.vx = (Math.random() - 0.5) * 0.3;
            s.vy = 0.5 + Math.random() * 0.8;
            s.vz = (Math.random() - 0.5) * 0.3;
            s.life = 0.5 + Math.random() * 0.5;
            s.maxLife = s.life;
            s.mesh.material.opacity = 1.0;
            s.mesh.scale.setScalar(0.5 + Math.random() * 1.0);
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var gs = this._origScale.x;

        if (progress < 0.08) {
            // Prep pose: slight lean back, spotlight fades in
            var t = progress / 0.08;
            model.rotation.z = t * 0.06;
            model.position.set(orig.x, orig.y, orig.z);
            this._spotlight.material.opacity = t * 0.3;
            this._spotlight.position.x = orig.x;
        } else if (progress < 0.45) {
            // Moonwalk right to left: slide backward while bobbing
            var t2 = (progress - 0.08) / 0.37;
            var slideX = orig.x + 0.8 - t2 * 1.6;
            var bob = Math.sin(time * 8) * 0.03;
            var lean = 0.06 + Math.sin(time * 4) * 0.02;

            model.position.set(slideX, orig.y + bob, orig.z);
            model.rotation.z = lean;

            // Squash/stretch with walk cycle
            var walkCycle = Math.sin(time * 8);
            model.scale.set(gs * (1 + walkCycle * 0.02), gs * (1 - walkCycle * 0.02), gs);

            this._spotlight.material.opacity = 0.3 + Math.sin(time * 2) * 0.1;
            this._spotlight.position.x = slideX;
            this._spotlight.scale.setScalar(1.0 + Math.sin(time * 3) * 0.15);

            // Emit sparkle trail
            if (time - this._lastSparkle > 0.08) {
                this._emitSparkle(slideX + 0.1, orig.y);
                this._lastSparkle = time;
            }
        } else if (progress < 0.75) {
            // Moonwalk back left to right
            var t3 = (progress - 0.45) / 0.30;
            var slideX2 = orig.x - 0.8 + t3 * 1.6;
            var bob2 = Math.sin(time * 8) * 0.03;
            var lean2 = -0.06 - Math.sin(time * 4) * 0.02;

            model.position.set(slideX2, orig.y + bob2, orig.z);
            model.rotation.z = lean2;

            var walkCycle2 = Math.sin(time * 8);
            model.scale.set(gs * (1 + walkCycle2 * 0.02), gs * (1 - walkCycle2 * 0.02), gs);

            this._spotlight.material.opacity = 0.3 + Math.sin(time * 2) * 0.1;
            this._spotlight.position.x = slideX2;

            if (time - this._lastSparkle > 0.08) {
                this._emitSparkle(slideX2 - 0.1, orig.y);
                this._lastSparkle = time;
            }
        } else if (progress < 0.88) {
            // Spin flourish
            var t4 = (progress - 0.75) / 0.13;
            var spinAngle = t4 * Math.PI * 4;
            model.position.set(orig.x, orig.y + Math.sin(t4 * Math.PI) * 0.15, orig.z);
            model.rotation.z = spinAngle;
            model.scale.setScalar(gs * (1 + Math.sin(t4 * Math.PI) * 0.1));

            this._spotlight.material.opacity = 0.5 * (1 - t4 * 0.5);
            this._spotlight.position.x = orig.x;
            this._spotlight.scale.setScalar(1.0 + t4 * 0.5);

            // Burst sparkles during spin
            if (time - this._lastSparkle > 0.05) {
                this._emitSparkle(orig.x, orig.y);
                this._lastSparkle = time;
            }
        } else {
            // Rest pose: settle back
            var t5 = (progress - 0.88) / 0.12;
            model.position.set(orig.x, orig.y, orig.z);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);

            this._spotlight.material.opacity = 0.25 * (1 - t5);
            this._spotlight.scale.setScalar(1.0 + t5 * 0.3);
        }

        // Update sparkle particles
        for (var si = 0; si < this._sparkles.length; si++) {
            var sp = this._sparkles[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            sp.mesh.position.z += sp.vz * delta;
            sp.vy -= 1.5 * delta;
            var lifeRatio = sp.life / sp.maxLife;
            sp.mesh.material.opacity = lifeRatio;
            sp.mesh.scale.setScalar((0.5 + Math.random() * 0.5) * lifeRatio);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._spotlight) {
            scene.remove(this._spotlight);
            this._spotlight.geometry.dispose();
            this._spotlight.material.dispose();
        }
        if (this._sparkles) {
            this._sparkles.forEach(function(s) {
                scene.remove(s.mesh);
                s.mesh.geometry.dispose();
                s.mesh.material.dispose();
            });
        }
        this._spotlight = this._sparkles = null;
    }
};
