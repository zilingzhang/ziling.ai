export default {
    name: 'Baking',
    label: 'baking',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Oven body (box)
        var ovenGeo = new THREE.BoxGeometry(0.5, 0.35, 0.3);
        var ovenMat = new THREE.MeshBasicMaterial({
            color: 0x884422, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._oven = new THREE.Mesh(ovenGeo, ovenMat);
        this._oven.position.set(ox - 0.35, oy - 0.25, 0);
        scene.add(this._oven);

        // Oven door (thin box that rotates open)
        var doorGeo = new THREE.BoxGeometry(0.48, 0.04, 0.28);
        var doorMat = new THREE.MeshBasicMaterial({
            color: 0xaa6633, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._door = new THREE.Mesh(doorGeo, doorMat);
        this._door.position.set(ox - 0.35, oy - 0.07, 0);
        scene.add(this._door);

        // Warmth glow inside oven
        var glowGeo = new THREE.SphereGeometry(0.22, 10, 10);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xff8800, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._warmGlow = new THREE.Mesh(glowGeo, glowMat);
        this._warmGlow.position.set(ox - 0.35, oy - 0.22, 0);
        scene.add(this._warmGlow);

        // Dough sphere (starts small, rises)
        var doughGeo = new THREE.SphereGeometry(0.08, 10, 10);
        var doughMat = new THREE.MeshBasicMaterial({
            color: 0xf5deb3, transparent: true, opacity: 0
        });
        this._dough = new THREE.Mesh(doughGeo, doughMat);
        this._dough.position.set(ox - 0.35, oy - 0.28, 0);
        scene.add(this._dough);

        // Timer ring
        var timerGeo = new THREE.RingGeometry(0.08, 0.1, 24);
        var timerMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._timer = new THREE.Mesh(timerGeo, timerMat);
        this._timer.position.set(ox + 0.15, oy + 0.15, 0);
        scene.add(this._timer);

        // Timer hand (line)
        var handGeo = new THREE.BufferGeometry();
        var handPos = new Float32Array([0, 0, 0, 0, 0.08, 0]);
        handGeo.setAttribute('position', new THREE.BufferAttribute(handPos, 3));
        var handMat = new THREE.LineBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0
        });
        this._timerHand = new THREE.Line(handGeo, handMat);
        this._timerHand.position.set(ox + 0.15, oy + 0.15, 0);
        scene.add(this._timerHand);

        // Steam particles
        this._steam = [];
        var steamGeo = new THREE.SphereGeometry(0.03, 6, 6);
        for (var i = 0; i < 20; i++) {
            var stMat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var stMesh = new THREE.Mesh(steamGeo, stMat);
            stMesh.visible = false;
            scene.add(stMesh);
            this._steam.push({
                mesh: stMesh, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0
            });
        }
        this._steamIdx = 0;

        // Bread (golden sphere, revealed at end)
        var breadGeo = new THREE.SphereGeometry(0.12, 10, 10);
        var breadMat = new THREE.MeshBasicMaterial({
            color: 0xdaa520, transparent: true, opacity: 0
        });
        this._bread = new THREE.Mesh(breadGeo, breadMat);
        this._bread.position.set(ox - 0.35, oy - 0.2, 0);
        this._bread.visible = false;
        scene.add(this._bread);
    },
    _emitSteam(x, y) {
        for (var i = 0; i < 4; i++) {
            var s = this._steam[this._steamIdx % this._steam.length];
            this._steamIdx++;
            s.mesh.visible = true;
            s.mesh.position.set(x + (Math.random() - 0.5) * 0.2, y, 0);
            s.vx = (Math.random() - 0.5) * 0.3;
            s.vy = 0.8 + Math.random() * 0.6;
            s.vz = (Math.random() - 0.5) * 0.2;
            s.life = 0.6 + Math.random() * 0.5;
            s.maxLife = s.life;
            s.mesh.material.opacity = 0.6;
            s.mesh.scale.setScalar(0.5 + Math.random() * 0.5);
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        if (progress < 0.08) {
            // Phase 1: Oven appears
            var t = progress / 0.08;
            var ease = t * t;
            this._oven.material.opacity = ease * 0.6;
            this._door.material.opacity = ease * 0.5;
            this._dough.material.opacity = ease * 0.8;
            this._timer.material.opacity = ease * 0.4;
            this._timerHand.material.opacity = ease * 0.4;
            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.45) {
            // Phase 2: Dough placed, starts rising, warmth glow
            var t2 = (progress - 0.08) / 0.37;
            this._oven.material.opacity = 0.6;
            this._door.material.opacity = 0.5;
            this._dough.material.opacity = 0.8;

            // Dough slowly rises
            var rise = t2 * 0.6;
            this._dough.scale.set(1 + rise * 0.3, 1 + rise * 0.5, 1 + rise * 0.3);
            this._dough.position.y = oy - 0.28 + rise * 0.05;

            // Color shifts toward golden
            var goldShift = t2;
            var r = 0.96 + goldShift * 0.04;
            var g = 0.87 - goldShift * 0.15;
            var b = 0.70 - goldShift * 0.35;
            this._dough.material.color.setRGB(r, g, b);

            // Warmth glow intensifies
            this._warmGlow.material.opacity = t2 * 0.25 + Math.sin(time * 4) * 0.05;
            this._warmGlow.scale.setScalar(1 + Math.sin(time * 3) * 0.1);

            // Timer rotates
            this._timer.material.opacity = 0.4;
            this._timerHand.material.opacity = 0.4;
            this._timerHand.rotation.z = -t2 * Math.PI * 2;

            // Model sways gently
            model.position.set(ox + 0.15, oy + Math.sin(time * 2) * 0.02, oz);
            model.rotation.z = Math.sin(time * 1.5) * 0.03;
        } else if (progress < 0.70) {
            // Phase 3: Dough expands fully, golden color deepens
            var t3 = (progress - 0.45) / 0.25;
            var totalRise = 0.6 + t3 * 0.4;
            this._dough.scale.set(1 + totalRise * 0.3, 1 + totalRise * 0.5, 1 + totalRise * 0.3);
            this._dough.position.y = oy - 0.28 + totalRise * 0.05;

            // Deeper golden brown
            this._dough.material.color.setRGB(0.85 - t3 * 0.1, 0.65 - t3 * 0.1, 0.25 - t3 * 0.1);

            // Warmth glow pulses stronger
            this._warmGlow.material.opacity = 0.25 + t3 * 0.15 + Math.sin(time * 5) * 0.08;
            this._warmGlow.material.color.setHex(t3 > 0.5 ? 0xffaa00 : 0xff8800);

            // Timer continues
            this._timerHand.rotation.z = -(0.45 / 0.70 + t3 * 0.25 / 0.70) * Math.PI * 2;

            // Oven shimmers
            this._oven.material.opacity = 0.6 + Math.sin(time * 6) * 0.1;

            model.position.set(ox + 0.15, oy, oz);
            model.rotation.z = 0;
        } else if (progress < 0.90) {
            // Phase 4: Oven opens, steam burst, bread reveals
            var t4 = (progress - 0.70) / 0.20;

            // Door opens (drops down)
            this._door.position.y = oy - 0.07 - t4 * 0.18;
            this._door.material.opacity = 0.5 * (1 - t4 * 0.3);

            // Steam burst
            if (t4 < 0.5) {
                this._emitSteam(ox - 0.35, oy - 0.08);
            }

            // Hide dough, show bread
            this._dough.material.opacity = 0.8 * (1 - t4);
            this._bread.visible = true;
            this._bread.material.opacity = t4 * 0.9;
            this._bread.position.set(ox - 0.35, oy - 0.2 + t4 * 0.15, 0);
            this._bread.scale.setScalar(0.8 + t4 * 0.4);

            // Warm glow fades
            this._warmGlow.material.opacity = 0.4 * (1 - t4);

            // Model reaches toward bread
            model.position.set(ox + 0.15 - t4 * 0.1, oy + t4 * 0.05, oz);
            model.rotation.z = -t4 * 0.05;

            // Timer done
            this._timer.material.opacity = 0.4 * (1 - t4);
            this._timerHand.material.opacity = 0.4 * (1 - t4);
        } else {
            // Phase 5: Settle
            var t5 = (progress - 0.90) / 0.10;
            model.position.set(
                ox + 0.15 * (1 - t5) - 0.1 * (1 - t5),
                oy + 0.05 * (1 - t5),
                oz
            );
            model.rotation.z = -0.05 * (1 - t5);
            model.scale.copy(this._origScale);

            this._oven.material.opacity = 0.6 * (1 - t5);
            this._door.material.opacity = 0.35 * (1 - t5);
            this._bread.material.opacity = 0.9 * (1 - t5);
            this._bread.scale.setScalar(1.2 + t5 * 0.1);
            this._warmGlow.material.opacity = 0;
            this._timer.material.opacity = 0;
            this._timerHand.material.opacity = 0;
        }

        // Update steam particles
        for (var si = 0; si < this._steam.length; si++) {
            var sp = this._steam[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            sp.mesh.position.z += sp.vz * delta;
            var lr = sp.life / sp.maxLife;
            sp.mesh.material.opacity = lr * 0.5;
            sp.mesh.scale.setScalar(0.5 + (1 - lr) * 1.2);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._oven) { scene.remove(this._oven); this._oven.geometry.dispose(); this._oven.material.dispose(); }
        if (this._door) { scene.remove(this._door); this._door.geometry.dispose(); this._door.material.dispose(); }
        if (this._warmGlow) { scene.remove(this._warmGlow); this._warmGlow.geometry.dispose(); this._warmGlow.material.dispose(); }
        if (this._dough) { scene.remove(this._dough); this._dough.geometry.dispose(); this._dough.material.dispose(); }
        if (this._timer) { scene.remove(this._timer); this._timer.geometry.dispose(); this._timer.material.dispose(); }
        if (this._timerHand) { scene.remove(this._timerHand); this._timerHand.geometry.dispose(); this._timerHand.material.dispose(); }
        if (this._bread) { scene.remove(this._bread); this._bread.geometry.dispose(); this._bread.material.dispose(); }
        if (this._steam) { this._steam.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        this._oven = this._door = this._warmGlow = this._dough = this._timer = this._timerHand = this._bread = this._steam = null;
    }
};
