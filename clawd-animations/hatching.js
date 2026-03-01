export default {
    name: 'Hatching',
    label: 'hatching',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Egg (oval sphere)
        var eggGeo = new THREE.SphereGeometry(0.12, 10, 10);
        var eggMat = new THREE.MeshBasicMaterial({
            color: 0xeeddcc, transparent: true, opacity: 0
        });
        this._egg = new THREE.Mesh(eggGeo, eggMat);
        this._egg.position.set(ox, oy - 0.25, 0);
        this._egg.scale.set(0.85, 1.1, 0.85);
        scene.add(this._egg);

        // Crack lines on egg surface
        this._cracks = [];
        for (var c = 0; c < 8; c++) {
            var cGeo = new THREE.BoxGeometry(0.002, 0.04 + Math.random() * 0.04, 0.001);
            var cMat = new THREE.MeshBasicMaterial({
                color: 0x554433, transparent: true, opacity: 0
            });
            var crack = new THREE.Mesh(cGeo, cMat);
            var cAngle = (c / 8) * Math.PI * 2 + Math.random() * 0.3;
            crack.position.set(
                ox + Math.cos(cAngle) * 0.1,
                oy - 0.25 + Math.sin(cAngle) * 0.12,
                0.05
            );
            crack.rotation.z = cAngle + Math.random() * 0.5;
            crack.visible = false;
            scene.add(crack);
            this._cracks.push({ mesh: crack, angle: cAngle, appeared: false });
        }

        // Shell fragments (flat triangular pieces)
        this._fragments = [];
        for (var f = 0; f < 12; f++) {
            var fGeo = new THREE.BufferGeometry();
            var vertices = new Float32Array([
                0, 0, 0,
                0.03, 0.01, 0,
                0.01, 0.03, 0
            ]);
            fGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            fGeo.computeVertexNormals();
            var fMat = new THREE.MeshBasicMaterial({
                color: f % 2 === 0 ? 0xeeddcc : 0xddccbb,
                transparent: true, opacity: 0,
                side: THREE.DoubleSide, depthWrite: false
            });
            var frag = new THREE.Mesh(fGeo, fMat);
            frag.visible = false;
            scene.add(frag);
            this._fragments.push({
                mesh: frag, life: 0, maxLife: 0,
                vx: 0, vy: 0, spin: 0, spinSpeed: 0
            });
        }
        this._fragIdx = 0;

        // New creation (glowing sphere that emerges)
        var newGeo = new THREE.SphereGeometry(0.06, 10, 10);
        var newMat = new THREE.MeshBasicMaterial({
            color: 0xffeeaa, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._newCreation = new THREE.Mesh(newGeo, newMat);
        this._newCreation.position.set(ox, oy - 0.25, 0);
        scene.add(this._newCreation);

        // Emergence glow
        var glowGeo = new THREE.SphereGeometry(0.3, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0xffdd88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._birthGlow = new THREE.Mesh(glowGeo, glowMat);
        this._birthGlow.position.set(ox, oy - 0.15, 0);
        scene.add(this._birthGlow);

        // Nest base
        var nestGeo = new THREE.TorusGeometry(0.15, 0.03, 6, 12);
        var nestMat = new THREE.MeshBasicMaterial({
            color: 0x886644, transparent: true, opacity: 0
        });
        this._nest = new THREE.Mesh(nestGeo, nestMat);
        this._nest.position.set(ox, oy - 0.32, 0);
        this._nest.rotation.x = Math.PI * 0.5;
        scene.add(this._nest);

        this._joltCount = 0;
        this._lastJolt = 0;
    },
    _spawnFragment(ox, oy) {
        var f = this._fragments[this._fragIdx % this._fragments.length];
        this._fragIdx++;
        f.mesh.visible = true;
        var angle = Math.random() * Math.PI * 2;
        f.mesh.position.set(
            ox + Math.cos(angle) * 0.1,
            oy - 0.25 + Math.sin(angle) * 0.08,
            0.02
        );
        f.vx = Math.cos(angle) * (0.3 + Math.random() * 0.4);
        f.vy = Math.sin(angle) * 0.3 + 0.2 + Math.random() * 0.3;
        f.life = 0.6 + Math.random() * 0.5;
        f.maxLife = f.life;
        f.spinSpeed = (Math.random() - 0.5) * 8;
        f.mesh.material.opacity = 0.8;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        // Phase 1: Egg appears in nest (0-12%)
        if (progress < 0.12) {
            var t = progress / 0.12;
            this._egg.material.opacity = t * 0.8;
            this._nest.material.opacity = t * 0.6;
            model.position.set(ox + 0.25, oy, oz);
        }
        // Phase 2: Cracks appear (12-30%)
        else if (progress < 0.30) {
            var t2 = (progress - 0.12) / 0.18;
            this._egg.material.opacity = 0.8;
            this._nest.material.opacity = 0.6;

            // Cracks spread sequentially
            for (var c = 0; c < this._cracks.length; c++) {
                var crackT = c / this._cracks.length;
                if (t2 > crackT) {
                    var cr = this._cracks[c];
                    cr.mesh.visible = true;
                    cr.mesh.material.opacity = Math.min((t2 - crackT) * 5, 0.7);
                }
            }

            model.position.set(ox + 0.25, oy, oz);
        }
        // Phase 3: Tap-tap from inside (30-50%)
        else if (progress < 0.50) {
            var t3 = (progress - 0.30) / 0.20;

            // Egg jolts periodically
            if (time - this._lastJolt > 0.5 + Math.random() * 0.3) {
                this._lastJolt = time;
                this._joltCount++;
            }
            var joltDecay = Math.max(0, 1 - (time - this._lastJolt) * 5);
            var joltX = Math.sin(this._joltCount * 2.3) * 0.015 * joltDecay;
            var joltY = Math.cos(this._joltCount * 3.1) * 0.01 * joltDecay;
            this._egg.position.set(ox + joltX, oy - 0.25 + joltY, 0);

            // More cracks deepen
            for (var c2 = 0; c2 < this._cracks.length; c2++) {
                this._cracks[c2].mesh.material.opacity = Math.min(0.7 + t3 * 0.3, 1.0);
                // Cracks widen slightly
                this._cracks[c2].mesh.scale.x = 1 + t3 * 2;
            }

            model.position.set(ox + 0.25, oy, oz);
        }
        // Phase 4: Shell breaks apart (50-65%)
        else if (progress < 0.65) {
            var t4 = (progress - 0.50) / 0.15;

            // Egg dissolves
            this._egg.material.opacity = 0.8 * (1 - t4);
            this._egg.scale.set(0.85 + t4 * 0.2, 1.1 + t4 * 0.1, 0.85 + t4 * 0.2);

            // Hide cracks
            for (var c3 = 0; c3 < this._cracks.length; c3++) {
                this._cracks[c3].mesh.material.opacity = 1.0 * (1 - t4);
            }

            // Spawn fragments
            if (Math.random() < 0.2 + t4 * 0.3) {
                this._spawnFragment(ox, oy);
            }

            // New creation begins to emerge
            this._newCreation.material.opacity = t4 * 0.5;
            this._newCreation.position.set(ox, oy - 0.25 + t4 * 0.1, 0);
            this._newCreation.scale.setScalar(0.5 + t4 * 0.5);

            model.position.set(ox + 0.25, oy, oz);
        }
        // Phase 5: New creation rises from shell (65-82%)
        else if (progress < 0.82) {
            var t5 = (progress - 0.65) / 0.17;

            // Egg gone
            this._egg.material.opacity = 0;
            for (var c4 = 0; c4 < this._cracks.length; c4++) {
                this._cracks[c4].mesh.visible = false;
            }

            // New creation rises
            var riseY = oy - 0.15 + t5 * 0.2;
            this._newCreation.position.set(ox, riseY, 0);
            this._newCreation.material.opacity = 0.5 + t5 * 0.3;
            this._newCreation.scale.setScalar(1 + t5 * 0.5);

            // Birth glow
            this._birthGlow.position.set(ox, riseY, 0);
            this._birthGlow.material.opacity = t5 * 0.25;
            this._birthGlow.scale.setScalar(1 + t5 * 0.5);

            // Pulse
            var pulse = Math.sin(time * 4) * 0.05;
            this._newCreation.scale.setScalar(1 + t5 * 0.5 + pulse);

            model.position.set(ox + 0.25, oy, oz);
        }
        // Phase 6: Fade out (82-100%)
        else {
            var t6 = (progress - 0.82) / 0.18;

            this._newCreation.material.opacity = 0.8 * (1 - t6);
            this._newCreation.scale.setScalar(1.5 + t6 * 0.5);
            this._birthGlow.material.opacity = 0.25 * (1 - t6);
            this._birthGlow.scale.setScalar(1.5 + t6 * 0.5);
            this._nest.material.opacity = 0.6 * (1 - t6);

            model.position.set(
                ox + 0.25 * (1 - t6),
                oy,
                oz
            );
            if (t6 > 0.8) {
                model.position.copy(this._origPos);
            }
        }

        // Update fragments
        for (var fi = 0; fi < this._fragments.length; fi++) {
            var fr = this._fragments[fi];
            if (fr.life <= 0) continue;
            fr.life -= delta;
            if (fr.life <= 0) { fr.mesh.visible = false; continue; }
            fr.mesh.position.x += fr.vx * delta;
            fr.mesh.position.y += fr.vy * delta;
            fr.vy -= 2.0 * delta;
            fr.spin += fr.spinSpeed * delta;
            fr.mesh.rotation.z = fr.spin;
            fr.mesh.material.opacity = 0.8 * (fr.life / fr.maxLife);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._egg) { scene.remove(this._egg); this._egg.geometry.dispose(); this._egg.material.dispose(); }
        if (this._cracks) { this._cracks.forEach(function(c) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose(); }); }
        if (this._fragments) { this._fragments.forEach(function(f) { scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose(); }); }
        if (this._newCreation) { scene.remove(this._newCreation); this._newCreation.geometry.dispose(); this._newCreation.material.dispose(); }
        if (this._birthGlow) { scene.remove(this._birthGlow); this._birthGlow.geometry.dispose(); this._birthGlow.material.dispose(); }
        if (this._nest) { scene.remove(this._nest); this._nest.geometry.dispose(); this._nest.material.dispose(); }
        this._egg = this._cracks = this._fragments = this._newCreation = this._birthGlow = this._nest = null;
    }
};