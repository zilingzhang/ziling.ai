export default {
    name: 'Prestidigitating',
    label: 'prestidigitating',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();
        var ox = this._origPos.x, oy = this._origPos.y;

        // Playing cards (thin flat boxes)
        this._cards = [];
        var cardColors = [
            0xff3333, 0x3333ff, 0xff3333, 0x3333ff,
            0xff3333, 0x3333ff, 0xff3333, 0x3333ff,
            0xffcc00, 0xffcc00, 0x33ff33, 0x33ff33
        ];
        var cardGeo = new THREE.BoxGeometry(0.08, 0.12, 0.005);
        for (var i = 0; i < 12; i++) {
            var cMat = new THREE.MeshBasicMaterial({
                color: cardColors[i], transparent: true, opacity: 0,
                depthWrite: false, side: THREE.DoubleSide
            });
            var card = new THREE.Mesh(cardGeo, cMat);
            card.visible = false;
            scene.add(card);
            this._cards.push({
                mesh: card,
                angle: (i / 12) * Math.PI * 2,
                orbitRadius: 0.4 + (i % 3) * 0.1,
                yBase: oy + (i % 4) * 0.05 - 0.1,
                speed: 1.5 + (i % 3) * 0.3,
                flipSpeed: 2.0 + Math.random() * 2.0
            });
        }

        // Hat cylinder (magician's hat)
        var hatBodyGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.2, 16);
        var hatBodyMat = new THREE.MeshBasicMaterial({
            color: 0x222233, transparent: true, opacity: 0
        });
        this._hatBody = new THREE.Mesh(hatBodyGeo, hatBodyMat);
        this._hatBody.position.set(ox + 0.4, oy - 0.1, 0);
        this._hatBody.visible = false;
        scene.add(this._hatBody);

        var hatBrimGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.02, 16);
        var hatBrimMat = new THREE.MeshBasicMaterial({
            color: 0x222233, transparent: true, opacity: 0
        });
        this._hatBrim = new THREE.Mesh(hatBrimGeo, hatBrimMat);
        this._hatBrim.position.set(ox + 0.4, oy - 0.2, 0);
        this._hatBrim.visible = false;
        scene.add(this._hatBrim);

        // Dove particles (white, burst outward)
        this._doves = [];
        var doveGeo = new THREE.SphereGeometry(0.025, 6, 6);
        for (var d = 0; d < 20; d++) {
            var dMat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var dove = new THREE.Mesh(doveGeo, dMat);
            dove.visible = false;
            scene.add(dove);
            this._doves.push({
                mesh: dove, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0
            });
        }
        this._dovesBurst = false;

        // Magic orb (golden glow)
        var orbGeo = new THREE.SphereGeometry(0.1, 12, 12);
        var orbMat = new THREE.MeshBasicMaterial({
            color: 0xffdd44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._orb = new THREE.Mesh(orbGeo, orbMat);
        this._orb.position.set(ox + 0.4, oy, 0);
        this._orb.scale.set(0, 0, 0);
        scene.add(this._orb);

        // Sparkle trail particles
        this._sparkles = [];
        var spkGeo = new THREE.SphereGeometry(0.012, 4, 4);
        for (var s = 0; s < 15; s++) {
            var sMat = new THREE.MeshBasicMaterial({
                color: 0xffee88, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var spk = new THREE.Mesh(spkGeo, sMat);
            spk.visible = false;
            scene.add(spk);
            this._sparkles.push({
                mesh: spk, life: 0, maxLife: 0,
                vx: 0, vy: 0, vz: 0
            });
        }
        this._spkIdx = 0;
    },
    _burstDoves(x, y) {
        for (var i = 0; i < this._doves.length; i++) {
            var d = this._doves[i];
            d.mesh.visible = true;
            d.mesh.position.set(x, y, 0);
            var angle = Math.random() * Math.PI * 2;
            var spd = 1.5 + Math.random() * 2.5;
            d.vx = Math.cos(angle) * spd;
            d.vy = Math.sin(angle) * spd * 0.5 + 1.5;
            d.vz = (Math.random() - 0.5) * 1.0;
            d.life = 0.6 + Math.random() * 0.5;
            d.maxLife = d.life;
            d.mesh.material.opacity = 1.0;
        }
    },
    _emitSparkle(x, y) {
        var s = this._sparkles[this._spkIdx % this._sparkles.length];
        this._spkIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x, y, 0);
        var angle = Math.random() * Math.PI * 2;
        var spd = 0.5 + Math.random() * 1.0;
        s.vx = Math.cos(angle) * spd;
        s.vy = Math.sin(angle) * spd;
        s.vz = (Math.random() - 0.5) * 0.5;
        s.life = 0.3 + Math.random() * 0.3;
        s.maxLife = s.life;
        s.mesh.material.opacity = 1.0;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x, oy = this._origPos.y, oz = this._origPos.z;

        if (progress < 0.12) {
            // Phase 1: Dramatic hand wave, first cards appear
            var t = progress / 0.12;
            model.rotation.z = Math.sin(t * Math.PI * 2) * 0.1;
            model.position.set(ox + Math.sin(t * Math.PI) * 0.05, oy, oz);

            var numCards = Math.floor(t * 5);
            for (var i = 0; i < this._cards.length; i++) {
                if (i < numCards) {
                    var c = this._cards[i];
                    c.mesh.visible = true;
                    c.mesh.material.opacity = Math.min((t - i / 5 * 0.12 / 0.12) * 3, 0.9);
                    c.mesh.position.set(ox + (i - 2) * 0.06, oy + 0.2, 0);
                    c.mesh.rotation.y = 0;
                }
            }
        } else if (progress < 0.35) {
            // Phase 2: Cards fan out and orbit
            var t2 = (progress - 0.12) / 0.23;
            model.rotation.z = Math.sin(time * 2) * 0.03;

            for (var i2 = 0; i2 < this._cards.length; i2++) {
                var c2 = this._cards[i2];
                var cardT = Math.min(t2 * 2, 1);
                c2.mesh.visible = true;
                c2.mesh.material.opacity = 0.9;
                var a = c2.angle + time * c2.speed * cardT;
                c2.mesh.position.set(
                    ox + Math.cos(a) * c2.orbitRadius * cardT,
                    c2.yBase + Math.sin(time * 2 + i2) * 0.03,
                    Math.sin(a) * c2.orbitRadius * cardT * 0.3
                );
                c2.mesh.rotation.y = time * c2.flipSpeed * cardT;
            }
        } else if (progress < 0.55) {
            // Phase 3: Cards shuffle rapidly, dove burst
            var t3 = (progress - 0.35) / 0.20;

            for (var i3 = 0; i3 < this._cards.length; i3++) {
                var c3 = this._cards[i3];
                var a3 = c3.angle + time * c3.speed * 2.0;
                c3.mesh.position.set(
                    ox + Math.cos(a3) * c3.orbitRadius * (1 - t3 * 0.3),
                    c3.yBase + Math.sin(time * 5 + i3) * 0.06,
                    Math.sin(a3) * c3.orbitRadius * 0.3
                );
                c3.mesh.rotation.y = time * c3.flipSpeed * 2.0;
                c3.mesh.material.opacity = 0.9 - t3 * 0.3;
            }

            // Dove burst at midpoint
            if (t3 > 0.4 && !this._dovesBurst) {
                this._dovesBurst = true;
                this._burstDoves(ox, oy + 0.1);
            }

            model.rotation.z = Math.sin(time * 3) * 0.05;
        } else if (progress < 0.72) {
            // Phase 4: Hat appears, model reaches toward it
            var t4 = (progress - 0.55) / 0.17;
            var hatEase = 1 - Math.pow(1 - Math.min(t4 * 2, 1), 3);

            this._hatBody.visible = true;
            this._hatBrim.visible = true;
            this._hatBody.material.opacity = hatEase * 0.9;
            this._hatBrim.material.opacity = hatEase * 0.9;

            // Cards fade
            for (var i4 = 0; i4 < this._cards.length; i4++) {
                this._cards[i4].mesh.material.opacity = 0.6 * (1 - t4);
                if (t4 > 0.8) this._cards[i4].mesh.visible = false;
            }

            // Model leans toward hat
            model.position.set(ox + t4 * 0.15, oy, oz);
            model.rotation.z = -t4 * 0.08;
        } else if (progress < 0.88) {
            // Phase 5: Pull out glowing orb with sparkle burst
            var t5 = (progress - 0.72) / 0.16;
            var orbEase = 1 - Math.pow(1 - Math.min(t5 * 1.5, 1), 2);

            this._hatBody.material.opacity = 0.9;
            this._hatBrim.material.opacity = 0.9;

            this._orb.scale.setScalar(orbEase);
            this._orb.material.opacity = orbEase * 0.8;
            this._orb.position.set(
                ox + 0.4,
                oy - 0.1 + orbEase * 0.35,
                0
            );

            // Sparkle emissions
            if (t5 > 0.2 && Math.random() < 0.3) {
                this._emitSparkle(this._orb.position.x, this._orb.position.y);
            }

            model.position.set(ox + 0.15, oy, oz);
            model.rotation.z = -0.08 + t5 * 0.04;
        } else {
            // Phase 6: Bow/settle
            var t6 = (progress - 0.88) / 0.12;

            model.position.set(ox + 0.15 * (1 - t6), oy, oz);
            model.rotation.z = (-0.04 + t6 * 0.04);

            this._hatBody.material.opacity = 0.9 * (1 - t6);
            this._hatBrim.material.opacity = 0.9 * (1 - t6);
            this._orb.material.opacity = 0.8 * (1 - t6);
            this._orb.scale.setScalar(1.0 + t6 * 0.3);

            for (var i6 = 0; i6 < this._cards.length; i6++) {
                this._cards[i6].mesh.visible = false;
            }
        }

        // Update dove particles
        for (var di = 0; di < this._doves.length; di++) {
            var dv = this._doves[di];
            if (dv.life <= 0) continue;
            dv.life -= delta;
            if (dv.life <= 0) { dv.mesh.visible = false; continue; }
            dv.mesh.position.x += dv.vx * delta;
            dv.mesh.position.y += dv.vy * delta;
            dv.mesh.position.z += dv.vz * delta;
            dv.vy -= 1.5 * delta;
            var lr = dv.life / dv.maxLife;
            dv.mesh.material.opacity = lr;
            dv.mesh.scale.setScalar(0.5 + 0.5 * lr);
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
            sp.vy -= 0.5 * delta;
            var slr = sp.life / sp.maxLife;
            sp.mesh.material.opacity = slr;
            sp.mesh.scale.setScalar(0.3 + 0.7 * slr);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._cards) { this._cards.forEach(function(c) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose(); }); }
        if (this._hatBody) { scene.remove(this._hatBody); this._hatBody.geometry.dispose(); this._hatBody.material.dispose(); }
        if (this._hatBrim) { scene.remove(this._hatBrim); this._hatBrim.geometry.dispose(); this._hatBrim.material.dispose(); }
        if (this._doves) { this._doves.forEach(function(d) { scene.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose(); }); }
        if (this._orb) { scene.remove(this._orb); this._orb.geometry.dispose(); this._orb.material.dispose(); }
        if (this._sparkles) { this._sparkles.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        this._cards = this._hatBody = this._hatBrim = this._doves = this._orb = this._sparkles = null;
    }
};
