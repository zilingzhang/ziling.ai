export default {
    name: 'Frosting',
    label: 'frosting',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Cake body (cylinder)
        var cakeGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.2, 16);
        var cakeMat = new THREE.MeshBasicMaterial({
            color: 0xaa7744, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._cake = new THREE.Mesh(cakeGeo, cakeMat);
        this._cake.position.set(ox - 0.25, oy - 0.2, 0);
        scene.add(this._cake);

        // Cake stand (thin disc)
        var standGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.02, 18);
        var standMat = new THREE.MeshBasicMaterial({
            color: 0xcccccc, transparent: true, opacity: 0,
            side: THREE.DoubleSide
        });
        this._stand = new THREE.Mesh(standGeo, standMat);
        this._stand.position.set(ox - 0.25, oy - 0.31, 0);
        scene.add(this._stand);

        // Frosting layers (torus rings spiraling up)
        this._frostLayers = [];
        for (var i = 0; i < 8; i++) {
            var radius = 0.18 - i * 0.005;
            var fGeo = new THREE.TorusGeometry(radius, 0.02, 8, 20);
            var fMat = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? 0xffffff : 0xffccdd,
                transparent: true, opacity: 0
            });
            var frost = new THREE.Mesh(fGeo, fMat);
            frost.position.set(ox - 0.25, oy - 0.3 + i * 0.025, 0);
            frost.rotation.x = Math.PI * 0.5;
            scene.add(frost);
            this._frostLayers.push(frost);
        }

        // Top swirl decoration
        var swirlGeo = new THREE.TorusGeometry(0.06, 0.025, 8, 16);
        var swirlMat = new THREE.MeshBasicMaterial({
            color: 0xffaacc, transparent: true, opacity: 0
        });
        this._swirl = new THREE.Mesh(swirlGeo, swirlMat);
        this._swirl.position.set(ox - 0.25, oy - 0.08, 0);
        this._swirl.rotation.x = Math.PI * 0.5;
        scene.add(this._swirl);

        // Sprinkle particles (multicolor tiny cubes)
        this._sprinkles = [];
        var sprinkGeo = new THREE.BoxGeometry(0.01, 0.01, 0.025);
        var sprinkColors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff, 0xff8800, 0xffffff];
        for (var j = 0; j < 40; j++) {
            var spMat = new THREE.MeshBasicMaterial({
                color: sprinkColors[j % sprinkColors.length],
                transparent: true, opacity: 0
            });
            var sp = new THREE.Mesh(sprinkGeo, spMat);
            sp.visible = false;
            scene.add(sp);
            this._sprinkles.push({
                mesh: sp, life: 0, maxLife: 0,
                vx: 0, vy: 0, landed: false,
                finalX: 0, finalY: 0
            });
        }
        this._sprinkIdx = 0;

        // Smooth spreading glow
        var spreadGeo = new THREE.CircleGeometry(0.2, 16);
        var spreadMat = new THREE.MeshBasicMaterial({
            color: 0xffddee, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._spreadGlow = new THREE.Mesh(spreadGeo, spreadMat);
        this._spreadGlow.position.set(ox - 0.25, oy - 0.15, 0.05);
        scene.add(this._spreadGlow);

        // Presentation glow
        var presGeo = new THREE.SphereGeometry(0.35, 12, 12);
        var presMat = new THREE.MeshBasicMaterial({
            color: 0xffccee, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._presGlow = new THREE.Mesh(presGeo, presMat);
        this._presGlow.position.set(ox - 0.25, oy - 0.15, 0);
        scene.add(this._presGlow);
    },
    _spawnSprinkle(x, y) {
        var s = this._sprinkles[this._sprinkIdx % this._sprinkles.length];
        this._sprinkIdx++;
        s.mesh.visible = true;
        s.mesh.position.set(x + (Math.random() - 0.5) * 0.3, y + 0.2, 0);
        s.vx = (Math.random() - 0.5) * 0.1;
        s.vy = -0.5 - Math.random() * 0.3;
        s.life = 1.0 + Math.random() * 0.5;
        s.maxLife = s.life;
        s.landed = false;
        s.finalX = x + (Math.random() - 0.5) * 0.25;
        s.finalY = y - 0.05 + Math.random() * 0.12;
        s.mesh.material.opacity = 0.8;
        s.mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;
        var cakeX = ox - 0.25;
        var cakeY = oy - 0.2;

        if (progress < 0.10) {
            // Phase 1: Cake and stand appear
            var t = progress / 0.10;
            var ease = t * t;
            this._cake.material.opacity = ease * 0.8;
            this._stand.material.opacity = ease * 0.6;
            model.position.set(ox + 0.15, oy, oz);
        } else if (progress < 0.50) {
            // Phase 2: Frosting applied layer by layer spiraling up
            var t2 = (progress - 0.10) / 0.40;
            this._cake.material.opacity = 0.8;
            this._stand.material.opacity = 0.6;

            var numLayers = Math.floor(t2 * this._frostLayers.length);
            for (var i = 0; i < this._frostLayers.length; i++) {
                if (i <= numLayers) {
                    var layerT = i < numLayers ? 1.0 : (t2 * this._frostLayers.length - numLayers);
                    this._frostLayers[i].material.opacity = layerT * 0.8;
                    this._frostLayers[i].scale.setScalar(0.5 + layerT * 0.5);
                } else {
                    this._frostLayers[i].material.opacity = 0;
                }
            }

            // Spreading glow follows current layer
            var currentLayerY = oy - 0.3 + numLayers * 0.025;
            this._spreadGlow.position.y = currentLayerY;
            this._spreadGlow.material.opacity = 0.15 + Math.sin(time * 6) * 0.05;

            // Model applies frosting - smooth lateral motion
            var spreadAngle = time * 1.5;
            model.position.set(
                ox + 0.15 + Math.cos(spreadAngle) * 0.03,
                oy + Math.sin(spreadAngle * 0.7) * 0.02,
                oz
            );
            model.rotation.z = Math.sin(spreadAngle) * 0.04;
        } else if (progress < 0.70) {
            // Phase 3: Sprinkles rain down
            var t3 = (progress - 0.50) / 0.20;

            // All frost layers visible
            for (var j = 0; j < this._frostLayers.length; j++) {
                this._frostLayers[j].material.opacity = 0.8;
                this._frostLayers[j].scale.setScalar(1);
            }

            this._spreadGlow.material.opacity = 0;

            // Spawn sprinkles
            if (Math.random() < 0.15 + t3 * 0.1) {
                this._spawnSprinkle(cakeX, cakeY);
            }

            model.position.set(ox + 0.15, oy + 0.05, oz);
            model.rotation.z = 0;
        } else if (progress < 0.85) {
            // Phase 4: Decorative swirl on top, presentation glow
            var t4 = (progress - 0.70) / 0.15;

            // Swirl appears with rotation
            this._swirl.material.opacity = t4 * 0.8;
            this._swirl.rotation.z = t4 * Math.PI * 2;
            this._swirl.scale.setScalar(0.5 + t4 * 0.5);

            // Presentation glow builds
            this._presGlow.material.opacity = t4 * 0.25;
            this._presGlow.scale.setScalar(1 + t4 * 0.3);

            // Occasional sprinkle
            if (Math.random() < 0.04) {
                this._spawnSprinkle(cakeX, cakeY);
            }

            model.position.set(ox + 0.15, oy, oz);
        } else {
            // Phase 5: Fade out
            var t5 = (progress - 0.85) / 0.15;
            this._cake.material.opacity = 0.8 * (1 - t5);
            this._stand.material.opacity = 0.6 * (1 - t5);
            this._swirl.material.opacity = 0.8 * (1 - t5);
            this._presGlow.material.opacity = 0.25 * (1 - t5);
            for (var k = 0; k < this._frostLayers.length; k++) {
                this._frostLayers[k].material.opacity = 0.8 * (1 - t5);
            }

            model.position.set(ox + 0.15 * (1 - t5), oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update sprinkles
        for (var si = 0; si < this._sprinkles.length; si++) {
            var sp = this._sprinkles[si];
            if (sp.life <= 0) continue;
            sp.life -= delta;
            if (sp.life <= 0) { sp.mesh.visible = false; continue; }
            if (!sp.landed) {
                sp.mesh.position.x += sp.vx * delta;
                sp.mesh.position.y += sp.vy * delta;
                sp.mesh.rotation.x += delta * 5;
                sp.mesh.rotation.z += delta * 3;
                // Check if landed on cake
                if (sp.mesh.position.y <= sp.finalY) {
                    sp.landed = true;
                    sp.mesh.position.set(sp.finalX, sp.finalY, 0);
                }
            }
            var lr = sp.life / sp.maxLife;
            if (sp.landed) {
                sp.mesh.material.opacity = Math.min(0.8, lr * 2);
            } else {
                sp.mesh.material.opacity = 0.8;
            }
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._cake) { scene.remove(this._cake); this._cake.geometry.dispose(); this._cake.material.dispose(); }
        if (this._stand) { scene.remove(this._stand); this._stand.geometry.dispose(); this._stand.material.dispose(); }
        if (this._swirl) { scene.remove(this._swirl); this._swirl.geometry.dispose(); this._swirl.material.dispose(); }
        if (this._spreadGlow) { scene.remove(this._spreadGlow); this._spreadGlow.geometry.dispose(); this._spreadGlow.material.dispose(); }
        if (this._presGlow) { scene.remove(this._presGlow); this._presGlow.geometry.dispose(); this._presGlow.material.dispose(); }
        if (this._frostLayers) { this._frostLayers.forEach(function(f) { scene.remove(f); f.geometry.dispose(); f.material.dispose(); }); }
        if (this._sprinkles) { this._sprinkles.forEach(function(s) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); }); }
        this._cake = this._stand = this._swirl = this._spreadGlow = this._presGlow = this._frostLayers = this._sprinkles = null;
    }
};
