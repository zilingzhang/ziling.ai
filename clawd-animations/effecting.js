export default {
    name: 'Effecting',
    label: 'effecting',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Domino chain (thin boxes)
        this._dominoes = [];
        var domGeo = new THREE.BoxGeometry(0.025, 0.12, 0.06);
        for (var i = 0; i < 10; i++) {
            var dMat = new THREE.MeshBasicMaterial({
                color: i < 3 ? 0x4488ff : (i < 6 ? 0x44aaff : (i < 8 ? 0x44ccff : 0x44eeff)),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var dom = new THREE.Mesh(domGeo, dMat);
            dom.position.set(ox - 0.5 + i * 0.1, oy - 0.1, 0);
            scene.add(dom);
            this._dominoes.push({
                mesh: dom,
                fallen: false,
                fallAngle: 0,
                origX: ox - 0.5 + i * 0.1
            });
        }

        // Ripple particles
        this._ripples = [];
        var ripGeo = new THREE.SphereGeometry(0.015, 4, 4);
        for (var j = 0; j < 20; j++) {
            var rMat = new THREE.MeshBasicMaterial({
                color: j % 3 === 0 ? 0x4488ff : (j % 3 === 1 ? 0x88ccff : 0xaaddff),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var rip = new THREE.Mesh(ripGeo, rMat);
            rip.visible = false;
            scene.add(rip);
            this._ripples.push({
                mesh: rip, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._ripIdx = 0;

        // Final explosion particles
        this._explosionParts = [];
        var expGeo = new THREE.SphereGeometry(0.025, 5, 5);
        for (var k = 0; k < 35; k++) {
            var eMat = new THREE.MeshBasicMaterial({
                color: k % 4 === 0 ? 0xff4444 : (k % 4 === 1 ? 0xffaa22 : (k % 4 === 2 ? 0xffff44 : 0xff8844)),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var exp = new THREE.Mesh(expGeo, eMat);
            exp.visible = false;
            scene.add(exp);
            this._explosionParts.push({
                mesh: exp, life: 0, maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._expIdx = 0;

        // Propagation wave ring
        var waveGeo = new THREE.TorusGeometry(0.05, 0.01, 6, 16);
        var waveMat = new THREE.MeshBasicMaterial({
            color: 0x88ccff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._wave = new THREE.Mesh(waveGeo, waveMat);
        this._wave.position.set(ox - 0.5, oy - 0.1, 0);
        scene.add(this._wave);

        // Final effect glow
        var fxGeo = new THREE.SphereGeometry(0.3, 12, 12);
        var fxMat = new THREE.MeshBasicMaterial({
            color: 0xff8844, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._fxGlow = new THREE.Mesh(fxGeo, fxMat);
        this._fxGlow.position.set(ox + 0.5, oy - 0.1, 0);
        scene.add(this._fxGlow);

        this._fallenCount = 0;
        this._pushTime = 0;
    },
    _spawnRipple(x, y) {
        for (var i = 0; i < 3; i++) {
            var r = this._ripples[this._ripIdx % this._ripples.length];
            this._ripIdx++;
            r.mesh.visible = true;
            r.mesh.position.set(x, y, 0);
            var angle = Math.random() * Math.PI * 2;
            var speed = 0.5 + Math.random() * 0.8;
            r.vx = Math.cos(angle) * speed;
            r.vy = Math.sin(angle) * speed;
            r.life = 0.3 + Math.random() * 0.2;
            r.maxLife = r.life;
            r.mesh.material.opacity = 0.7;
        }
    },
    _spawnExplosion(x, y, count) {
        for (var i = 0; i < count; i++) {
            var e = this._explosionParts[this._expIdx % this._explosionParts.length];
            this._expIdx++;
            e.mesh.visible = true;
            e.mesh.position.set(x, y, 0);
            var angle = Math.random() * Math.PI * 2;
            var speed = 1.5 + Math.random() * 3.0;
            e.vx = Math.cos(angle) * speed;
            e.vy = Math.sin(angle) * speed;
            e.life = 0.5 + Math.random() * 0.5;
            e.maxLife = e.life;
            e.mesh.material.opacity = 1.0;
        }
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        if (progress < 0.08) {
            // Phase 1: Dominoes appear
            var t = progress / 0.08;
            for (var i = 0; i < this._dominoes.length; i++) {
                var delay = i * 0.05;
                var di = Math.max(0, (t - delay) / (1 - delay));
                this._dominoes[i].mesh.material.opacity = di * 0.7;
            }
            model.position.set(ox - 0.6, oy, oz);
        } else if (progress < 0.18) {
            // Phase 2: Model pushes first domino
            var t2 = (progress - 0.08) / 0.10;
            model.position.set(ox - 0.6 + t2 * 0.1, oy, oz);
            model.rotation.z = -t2 * 0.1;

            // First domino starts to fall
            if (t2 > 0.5 && !this._dominoes[0].fallen) {
                this._dominoes[0].fallen = true;
                this._pushTime = time;
                this._fallenCount = 1;
            }
        } else if (progress < 0.72) {
            // Phase 3: Chain reaction propagates
            var t3 = (progress - 0.18) / 0.54;
            var chainIdx = Math.min(Math.floor(t3 * 10), 9);

            // Fall dominoes in sequence
            for (var j = 0; j < this._dominoes.length; j++) {
                var dom = this._dominoes[j];
                if (j <= chainIdx && !dom.fallen) {
                    dom.fallen = true;
                    this._fallenCount++;
                    this._spawnRipple(dom.origX, oy - 0.1);
                }

                if (dom.fallen) {
                    dom.fallAngle = Math.min(dom.fallAngle + delta * 4, Math.PI * 0.4);
                    dom.mesh.rotation.z = dom.fallAngle;
                    dom.mesh.position.x = dom.origX + Math.sin(dom.fallAngle) * 0.04;
                    dom.mesh.position.y = oy - 0.1 - (1 - Math.cos(dom.fallAngle)) * 0.03;
                } else {
                    dom.mesh.material.opacity = 0.7;
                }
            }

            // Propagation wave follows chain
            var waveX = ox - 0.5 + t3 * 1.0;
            this._wave.position.x = waveX;
            this._wave.material.opacity = 0.3 + Math.sin(time * 8) * 0.15;
            this._wave.rotation.x = time * 3;
            this._wave.scale.setScalar(1 + Math.sin(time * 6) * 0.2);

            // Model watches
            model.position.set(ox - 0.55, oy, oz);
            model.rotation.z = 0;
        } else if (progress < 0.88) {
            // Phase 4: Last domino triggers big explosion
            var t4 = (progress - 0.72) / 0.16;

            // All dominoes fallen
            for (var k = 0; k < this._dominoes.length; k++) {
                if (!this._dominoes[k].fallen) {
                    this._dominoes[k].fallen = true;
                }
                this._dominoes[k].fallAngle = Math.PI * 0.4;
                this._dominoes[k].mesh.rotation.z = Math.PI * 0.4;
                this._dominoes[k].mesh.material.opacity = 0.7 * (1 - t4 * 0.5);
            }

            // Big explosion at end
            if (t4 < 0.15) {
                this._spawnExplosion(ox + 0.5, oy - 0.1, 4);
            }

            this._fxGlow.material.opacity = Math.sin(t4 * Math.PI) * 0.5;
            this._fxGlow.scale.setScalar(1 + t4 * 2);

            this._wave.material.opacity = 0.3 * (1 - t4);

            model.position.set(ox - 0.55, oy, oz);
        } else {
            // Phase 5: Settle
            var t5 = (progress - 0.88) / 0.12;
            for (var m = 0; m < this._dominoes.length; m++) {
                this._dominoes[m].mesh.material.opacity *= 0.93;
            }
            this._fxGlow.material.opacity *= 0.9;
            this._wave.material.opacity = 0;

            model.position.set(ox - 0.55 + t5 * 0.55, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update ripple particles
        for (var ri = 0; ri < this._ripples.length; ri++) {
            var rp = this._ripples[ri];
            if (rp.life <= 0) continue;
            rp.life -= delta;
            if (rp.life <= 0) { rp.mesh.visible = false; continue; }
            rp.mesh.position.x += rp.vx * delta;
            rp.mesh.position.y += rp.vy * delta;
            var rlr = rp.life / rp.maxLife;
            rp.mesh.material.opacity = rlr * 0.6;
        }

        // Update explosion particles
        for (var ei = 0; ei < this._explosionParts.length; ei++) {
            var ep = this._explosionParts[ei];
            if (ep.life <= 0) continue;
            ep.life -= delta;
            if (ep.life <= 0) { ep.mesh.visible = false; continue; }
            ep.mesh.position.x += ep.vx * delta;
            ep.mesh.position.y += ep.vy * delta;
            ep.vy -= 2 * delta;
            var elr = ep.life / ep.maxLife;
            ep.mesh.material.opacity = elr;
            ep.mesh.scale.setScalar(0.5 + (1 - elr) * 1.0);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._dominoes) { this._dominoes.forEach(function(d) { scene.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose(); }); }
        if (this._ripples) { this._ripples.forEach(function(r) { scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); }); }
        if (this._explosionParts) { this._explosionParts.forEach(function(e) { scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose(); }); }
        if (this._wave) { scene.remove(this._wave); this._wave.geometry.dispose(); this._wave.material.dispose(); }
        if (this._fxGlow) { scene.remove(this._fxGlow); this._fxGlow.geometry.dispose(); this._fxGlow.material.dispose(); }
        this._dominoes = this._ripples = this._explosionParts = this._wave = this._fxGlow = null;
    }
};
