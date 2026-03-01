export default {
    name: 'Blacksmith Forge',
    label: 'forging',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Anvil glow (flat box below model)
        var anvilGeo = new THREE.BoxGeometry(0.4, 0.06, 0.2);
        var anvilMat = new THREE.MeshBasicMaterial({
            color: 0xff6600, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._anvil = new THREE.Mesh(anvilGeo, anvilMat);
        this._anvil.position.set(this._origPos.x - 0.3, this._origPos.y - 0.15, 0);
        scene.add(this._anvil);

        // Sparks
        this._sparks = [];
        var spkGeo = new THREE.SphereGeometry(0.02, 4, 4);
        for (var i = 0; i < 30; i++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0xffaa00 : (i % 3 === 1 ? 0xff6600 : 0xffdd44),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spk = new THREE.Mesh(spkGeo, sMat);
            spk.visible = false;
            scene.add(spk);
            this._sparks.push({ mesh: spk, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
        }
        this._spkIdx = 0;

        // Growing creation (glow that builds with each strike)
        var createGeo = new THREE.SphereGeometry(0.12, 12, 12);
        var createMat = new THREE.MeshBasicMaterial({
            color: 0xffcc44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._creation = new THREE.Mesh(createGeo, createMat);
        this._creation.position.set(this._origPos.x - 0.3, this._origPos.y - 0.1, 0);
        scene.add(this._creation);

        this._strikeCount = 0;
        this._lastStrike = 0;
    },
    _burstSparks(x, y) {
        for (var i = 0; i < 6; i++) {
            var s = this._sparks[this._spkIdx % this._sparks.length];
            this._spkIdx++;
            s.mesh.visible = true;
            s.mesh.position.set(x, y, 0);
            var a = -Math.PI * 0.1 + Math.random() * Math.PI * 1.2;
            var spd = 2.0 + Math.random() * 3.0;
            s.vx = Math.cos(a) * spd;
            s.vy = Math.sin(a) * spd;
            s.vz = (Math.random() - 0.5) * 1.5;
            s.life = 0.3 + Math.random() * 0.4;
            s.maxLife = s.life;
            s.mesh.material.opacity = 1.0;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var anvilX = orig.x - 0.3, anvilY = orig.y - 0.1;

        if (progress < 0.08) {
            // Setup: anvil appears
            var t = progress / 0.08;
            this._anvil.material.opacity = t * 0.5;
        } else if (progress < 0.75) {
            // Hammering loop
            var t2 = (progress - 0.08) / 0.67;
            this._anvil.material.opacity = 0.5 + Math.sin(time * 3) * 0.1;

            // Strike rhythm: every ~0.5s
            var strikeCycle = (time * 2.5) % 1.0;
            if (strikeCycle < 0.15) {
                // Down strike
                model.position.set(orig.x, orig.y + (0.15 - strikeCycle) * 1.5, orig.z);
                model.rotation.z = -0.08;
                if (strikeCycle < 0.02 && time - this._lastStrike > 0.35) {
                    this._burstSparks(anvilX, anvilY);
                    this._strikeCount++;
                    this._lastStrike = time;
                    // Anvil flash
                    this._anvil.material.opacity = 1.0;
                }
            } else if (strikeCycle < 0.5) {
                // Wind up
                var windUp = (strikeCycle - 0.15) / 0.35;
                model.position.set(orig.x, orig.y + windUp * 0.25, orig.z);
                model.rotation.z = windUp * 0.05;
            } else {
                model.position.set(orig.x, orig.y + 0.25 - (strikeCycle - 0.5) * 0.5, orig.z);
                model.rotation.z = 0.05 - (strikeCycle - 0.5) * 0.26;
            }

            // Creation grows with each strike
            var growth = Math.min(this._strikeCount / 12, 1);
            this._creation.material.opacity = growth * 0.6;
            this._creation.scale.setScalar(0.3 + growth * 1.2);
            this._creation.material.color.setHex(growth < 0.5 ? 0xff6600 : 0xffcc44);
        } else {
            // Cool down, creation pulses and fades
            var t3 = (progress - 0.75) / 0.25;
            model.position.copy(orig);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
            this._anvil.material.opacity = 0.5 * (1 - t3);
            this._creation.material.opacity = 0.6 * (1 - t3);
            this._creation.scale.setScalar((1.5 + t3 * 0.5) * (1 - t3 * 0.3));
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
            sp.vy -= 4 * delta;
            var lr = sp.life / sp.maxLife;
            sp.mesh.material.opacity = lr;
            sp.mesh.scale.setScalar(0.3 + 0.7 * lr);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._anvil) { scene.remove(this._anvil); this._anvil.geometry.dispose(); this._anvil.material.dispose(); }
        if (this._creation) { scene.remove(this._creation); this._creation.geometry.dispose(); this._creation.material.dispose(); }
        if (this._sparks) { this._sparks.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        this._anvil = this._creation = this._sparks = null;
    }
};
