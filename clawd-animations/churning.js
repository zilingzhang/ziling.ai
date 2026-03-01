export default {
    name: 'Churning',
    label: 'churning',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Butter churn body (cylinder)
        var churnGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.4, 12);
        var churnMat = new THREE.MeshBasicMaterial({
            color: 0x997755, transparent: true, opacity: 0,
            depthWrite: false
        });
        this._churn = new THREE.Mesh(churnGeo, churnMat);
        this._churn.position.set(ox - 0.3, oy - 0.1, 0);
        scene.add(this._churn);

        // Churn handle (thin cylinder)
        var handleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6);
        var handleMat = new THREE.MeshBasicMaterial({
            color: 0x886644, transparent: true, opacity: 0,
            depthWrite: false
        });
        this._handle = new THREE.Mesh(handleGeo, handleMat);
        this._handle.position.set(ox - 0.3, oy + 0.2, 0.01);
        scene.add(this._handle);

        // Handle knob
        var knobGeo = new THREE.SphereGeometry(0.03, 6, 6);
        var knobMat = new THREE.MeshBasicMaterial({
            color: 0x886644, transparent: true, opacity: 0,
            depthWrite: false
        });
        this._knob = new THREE.Mesh(knobGeo, knobMat);
        this._knob.position.set(ox - 0.3, oy + 0.45, 0.01);
        scene.add(this._knob);

        // Splash particles (liquid inside)
        this._splashes = [];
        var splGeo = new THREE.SphereGeometry(0.02, 4, 4);
        for (var i = 0; i < 25; i++) {
            var splMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0xffffee : (i % 3 === 1 ? 0xffeebb : 0xffdd88),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spl = new THREE.Mesh(splGeo, splMat);
            spl.visible = false;
            scene.add(spl);
            this._splashes.push({
                mesh: spl, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._splIdx = 0;

        // Thickening particles (shows consistency change)
        this._thickParticles = [];
        var thGeo = new THREE.SphereGeometry(0.025, 5, 5);
        for (var j = 0; j < 15; j++) {
            var thMat = new THREE.MeshBasicMaterial({
                color: 0xffcc44, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var th = new THREE.Mesh(thGeo, thMat);
            th.visible = false;
            scene.add(th);
            this._thickParticles.push({
                mesh: th, life: 0, maxLife: 0,
                angle: 0, radius: 0, speed: 0
            });
        }
        this._thIdx = 0;

        // Golden product sphere (butter emerges)
        var prodGeo = new THREE.SphereGeometry(0.1, 12, 12);
        var prodMat = new THREE.MeshBasicMaterial({
            color: 0xffdd44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._product = new THREE.Mesh(prodGeo, prodMat);
        this._product.position.set(ox - 0.3, oy + 0.15, 0);
        scene.add(this._product);

        // Effort glow
        var effortGeo = new THREE.SphereGeometry(0.3, 12, 12);
        var effortMat = new THREE.MeshBasicMaterial({
            color: 0xffcc66, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._effortGlow = new THREE.Mesh(effortGeo, effortMat);
        this._effortGlow.position.set(ox - 0.3, oy, 0);
        scene.add(this._effortGlow);

        this._handleY = 0;
        this._consistency = 0;
    },
    _spawnSplash(x, y, speed) {
        var s = this._splashes[this._splIdx % this._splashes.length];
        this._splIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x + (Math.random() - 0.5) * 0.15, y, 0.02);
        var angle = -Math.PI * 0.2 + Math.random() * Math.PI * 1.4;
        s.vx = Math.cos(angle) * speed;
        s.vy = Math.sin(angle) * speed * 1.5;
        s.life = 0.4 + Math.random() * 0.3;
        s.maxLife = s.life;
        s.mesh.material.opacity = 0.8;
    },
    _spawnThick(x, y) {
        var t = this._thickParticles[this._thIdx % this._thickParticles.length];
        this._thIdx++;
        t.mesh.visible = true;
        t.mesh.position.set(x, y, 0.01);
        t.angle = Math.random() * Math.PI * 2;
        t.radius = 0.03 + Math.random() * 0.08;
        t.speed = 1 + Math.random() * 2;
        t.life = 0.6 + Math.random() * 0.4;
        t.maxLife = t.life;
        t.mesh.material.opacity = 0.6;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        var churnX = ox - 0.3;
        var churnY = oy - 0.1;

        // Handle pumping motion (sinusoidal)
        this._handleY = Math.sin(time * 4) * 0.12;

        if (progress < 0.08) {
            // Phase 1: Churn appears
            var t = progress / 0.08;
            this._churn.material.opacity = t * 0.6;
            this._handle.material.opacity = t * 0.5;
            this._knob.material.opacity = t * 0.5;
            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.35) {
            // Phase 2: Slow churning, thin splashes
            var t2 = (progress - 0.08) / 0.27;
            this._churn.material.opacity = 0.6;
            this._handle.material.opacity = 0.5;
            this._knob.material.opacity = 0.5;

            // Handle moves up and down
            this._handle.position.y = oy + 0.2 + this._handleY;
            this._knob.position.y = oy + 0.45 + this._handleY;

            // Model pushes handle
            model.position.set(ox + 0.05, oy + 0.15 + this._handleY * 0.5, oz);
            model.rotation.z = this._handleY * 0.1;

            // Splashes at top of stroke
            if (Math.sin(time * 4) > 0.8 && Math.random() < 0.3) {
                this._spawnSplash(churnX, churnY + 0.15, 0.3 + t2 * 0.2);
            }

            this._consistency = t2 * 0.3;
        } else if (progress < 0.65) {
            // Phase 3: Vigorous churning, consistency thickens
            var t3 = (progress - 0.35) / 0.30;
            this._consistency = 0.3 + t3 * 0.5;

            // Faster handle motion
            var fastHandleY = Math.sin(time * 6) * 0.15;
            this._handle.position.y = oy + 0.2 + fastHandleY;
            this._knob.position.y = oy + 0.45 + fastHandleY;

            model.position.set(ox + 0.05, oy + 0.15 + fastHandleY * 0.5, oz);
            model.rotation.z = fastHandleY * 0.12;

            // More splashes
            if (Math.abs(Math.sin(time * 6)) > 0.7 && Math.random() < 0.4) {
                this._spawnSplash(churnX, churnY + 0.15, 0.5 + t3 * 0.3);
            }

            // Thickening particles swirl inside
            if (Math.random() < 0.1 + t3 * 0.15) {
                this._spawnThick(churnX, churnY);
            }

            // Effort glow builds
            this._effortGlow.material.opacity = t3 * 0.15;
        } else if (progress < 0.82) {
            // Phase 4: Product forms, golden sphere emerges
            var t4 = (progress - 0.65) / 0.17;
            this._consistency = 0.8 + t4 * 0.2;

            var slowHandleY = Math.sin(time * 3) * 0.08;
            this._handle.position.y = oy + 0.2 + slowHandleY;
            this._knob.position.y = oy + 0.45 + slowHandleY;

            model.position.set(ox + 0.05, oy + 0.15 + slowHandleY * 0.3, oz);
            model.rotation.z = slowHandleY * 0.05;

            // Product emerges
            this._product.material.opacity = t4 * 0.7;
            this._product.scale.setScalar(0.3 + t4 * 0.7);
            this._product.position.y = churnY + 0.15 + t4 * 0.2;

            // Glow intensifies
            this._effortGlow.material.opacity = 0.15 + t4 * 0.2;
            this._effortGlow.scale.setScalar(1 + t4 * 0.5);

            // Less splashing, more golden
            if (Math.random() < 0.08) {
                this._spawnSplash(churnX, churnY + 0.2, 0.2);
            }
        } else {
            // Phase 5: Settle, product glows, fade out
            var t5 = (progress - 0.82) / 0.18;

            this._churn.material.opacity = 0.6 * (1 - t5);
            this._handle.material.opacity = 0.5 * (1 - t5);
            this._knob.material.opacity = 0.5 * (1 - t5);

            this._product.material.opacity = 0.7 * (1 - t5 * 0.5);
            this._product.scale.setScalar(1.0 + Math.sin(t5 * Math.PI) * 0.2);
            this._product.position.y = churnY + 0.35;

            this._effortGlow.material.opacity = 0.35 * (1 - t5);
            this._effortGlow.scale.setScalar(1.5 + t5 * 0.5);

            model.position.set(ox + 0.05 * (1 - t5), oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update splash particles
        for (var si = 0; si < this._splashes.length; si++) {
            var sp = this._splashes[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            sp.mesh.position.x += sp.vx * delta;
            sp.mesh.position.y += sp.vy * delta;
            sp.vy -= 3 * delta;
            var lr = sp.life / sp.maxLife;
            sp.mesh.material.opacity = lr * 0.7;
            // Color thickens with consistency
            var thick = this._consistency;
            sp.mesh.material.color.setRGB(1, 0.8 + thick * 0.15, 0.3 + thick * 0.4);
        }

        // Update thick particles
        for (var ti = 0; ti < this._thickParticles.length; ti++) {
            var tp = this._thickParticles[ti];
            if (tp.life <= 0) continue;
            tp.life -= delta;
            if (tp.life <= 0) { tp.mesh.visible = false; continue; }
            tp.angle += tp.speed * delta;
            var cRad = tp.radius * (1 - this._consistency * 0.5);
            tp.mesh.position.x = churnX + Math.cos(tp.angle) * cRad;
            tp.mesh.position.y = churnY + Math.sin(tp.angle) * cRad * 0.5;
            var tlr = tp.life / tp.maxLife;
            tp.mesh.material.opacity = tlr * 0.5;
            tp.mesh.scale.setScalar(0.5 + this._consistency * 0.8);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._churn) { scene.remove(this._churn); this._churn.geometry.dispose(); this._churn.material.dispose(); }
        if (this._handle) { scene.remove(this._handle); this._handle.geometry.dispose(); this._handle.material.dispose(); }
        if (this._knob) { scene.remove(this._knob); this._knob.geometry.dispose(); this._knob.material.dispose(); }
        if (this._product) { scene.remove(this._product); this._product.geometry.dispose(); this._product.material.dispose(); }
        if (this._effortGlow) { scene.remove(this._effortGlow); this._effortGlow.geometry.dispose(); this._effortGlow.material.dispose(); }
        if (this._splashes) { this._splashes.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        if (this._thickParticles) { this._thickParticles.forEach(function(t) { scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose(); }); }
        this._churn = this._handle = this._knob = this._product = this._effortGlow = this._splashes = this._thickParticles = null;
    }
};
