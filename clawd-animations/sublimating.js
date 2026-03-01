export default {
    name: 'Sublimating',
    label: 'sublimating',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Ice block - translucent blue box around model
        var iceGeo = new THREE.BoxGeometry(0.5, 0.6, 0.3);
        var iceMat = new THREE.MeshBasicMaterial({
            color: 0x88ccff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.DoubleSide
        });
        this._iceBlock = new THREE.Mesh(iceGeo, iceMat);
        this._iceBlock.position.copy(this._origPos);
        scene.add(this._iceBlock);

        // Ice wireframe overlay for crystalline look
        var wireGeo = new THREE.BoxGeometry(0.52, 0.62, 0.32);
        var wireMat = new THREE.MeshBasicMaterial({
            color: 0xaaddff, transparent: true, opacity: 0,
            wireframe: true
        });
        this._iceWire = new THREE.Mesh(wireGeo, wireMat);
        this._iceWire.position.copy(this._origPos);
        scene.add(this._iceWire);

        // Vapor particles - white/light blue wisps
        this._vapor = [];
        var vapGeo = new THREE.SphereGeometry(1, 6, 6);
        for (var i = 0; i < 30; i++) {
            var vMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0xffffff : (i % 3 === 1 ? 0xccddff : 0xddeeff),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var vap = new THREE.Mesh(vapGeo, vMat);
            vap.visible = false;
            scene.add(vap);

            // Vapor rises from block surface
            var side = Math.floor(Math.random() * 4); // top, left, right, front
            var startX, startY;
            if (side === 0) { startX = (Math.random() - 0.5) * 0.5; startY = 0.3; }
            else if (side === 1) { startX = -0.25; startY = (Math.random() - 0.5) * 0.6; }
            else if (side === 2) { startX = 0.25; startY = (Math.random() - 0.5) * 0.6; }
            else { startX = (Math.random() - 0.5) * 0.5; startY = -0.3; }

            this._vapor.push({
                mesh: vap,
                size: 0.02 + Math.random() * 0.03,
                startX: startX,
                startY: startY,
                life: 0,
                maxLife: 0,
                vx: 0, vy: 0,
                driftPhase: Math.random() * Math.PI * 2,
                active: false
            });
        }
        this._vapIdx = 0;

        // Frost sparkle particles
        this._frost = [];
        var frostGeo = new THREE.SphereGeometry(0.01, 4, 4);
        for (var f = 0; f < 15; f++) {
            var fMat = new THREE.MeshBasicMaterial({
                color: f % 2 === 0 ? 0xffffff : 0xddeeFF,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var frost = new THREE.Mesh(frostGeo, fMat);
            frost.visible = false;
            scene.add(frost);
            this._frost.push({
                mesh: frost,
                life: 0,
                maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._frostIdx = 0;

        // Temperature glow - transitions blue to white
        var tempGeo = new THREE.SphereGeometry(0.4, 16, 16);
        var tempMat = new THREE.MeshBasicMaterial({
            color: 0x6699ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._tempGlow = new THREE.Mesh(tempGeo, tempMat);
        this._tempGlow.position.copy(this._origPos);
        scene.add(this._tempGlow);
    },
    _emitVapor(origX, origY, blockScale) {
        var v = this._vapor[this._vapIdx % this._vapor.length];
        this._vapIdx++;
        v.mesh.visible = true;
        v.active = true;
        var sx = origX + v.startX * blockScale;
        var sy = origY + v.startY * blockScale;
        v.mesh.position.set(sx, sy, 0.05);
        v.mesh.scale.setScalar(v.size);
        v.vx = (Math.random() - 0.5) * 0.2;
        v.vy = 0.15 + Math.random() * 0.25;
        v.life = 1.5 + Math.random() * 1.5;
        v.maxLife = v.life;
        v.mesh.material.opacity = 0.3;
    },
    _emitFrost(x, y) {
        var f = this._frost[this._frostIdx % this._frost.length];
        this._frostIdx++;
        f.mesh.visible = true;
        f.mesh.position.set(x, y, 0.1);
        var a = Math.random() * Math.PI * 2;
        f.vx = Math.cos(a) * (0.2 + Math.random() * 0.3);
        f.vy = Math.sin(a) * (0.2 + Math.random() * 0.3);
        f.life = 0.3 + Math.random() * 0.3;
        f.maxLife = f.life;
        f.mesh.material.opacity = 0.7;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;

        // Ice block scale factor - shrinks during sublimation
        var blockScale = 1;
        var blockOpacity = 0;

        if (progress < 0.12) {
            // Phase 1: Ice crystallizes around model
            var crystT = progress / 0.12;
            blockScale = crystT;
            blockOpacity = crystT * 0.35;
            // Emit frost sparkles during crystallization
            if (Math.random() < 0.2) {
                this._emitFrost(
                    orig.x + (Math.random() - 0.5) * 0.4 * crystT,
                    orig.y + (Math.random() - 0.5) * 0.5 * crystT
                );
            }
        } else if (progress < 0.35) {
            // Phase 2: Surface vapor begins
            blockScale = 1;
            blockOpacity = 0.35;
            // Light vapor emission
            if (Math.random() < 0.08) {
                this._emitVapor(orig.x, orig.y, blockScale);
            }
        } else if (progress < 0.65) {
            // Phase 3: Rapid sublimation
            var subT = (progress - 0.35) / 0.30;
            blockScale = 1 - subT * 0.8;
            blockOpacity = 0.35 * (1 - subT * 0.7);
            // Intense vapor
            if (Math.random() < 0.20) {
                this._emitVapor(orig.x, orig.y, blockScale);
            }
            if (Math.random() < 0.08) {
                this._emitFrost(
                    orig.x + (Math.random() - 0.5) * 0.3,
                    orig.y + (Math.random() - 0.5) * 0.4
                );
            }
        } else if (progress < 0.82) {
            // Phase 4: Block gone, model in vapor cloud
            blockScale = 0.2 * (1 - (progress - 0.65) / 0.17);
            blockOpacity = 0.1 * (1 - (progress - 0.65) / 0.17);
            // Vapor still rising
            if (Math.random() < 0.10) {
                this._emitVapor(orig.x, orig.y, 0.5);
            }
        } else {
            // Phase 5: Vapor disperses, model clear
            blockScale = 0;
            blockOpacity = 0;
        }

        // Apply ice block
        this._iceBlock.scale.setScalar(Math.max(0.01, blockScale));
        this._iceBlock.material.opacity = blockOpacity;
        this._iceBlock.position.copy(orig);
        this._iceWire.scale.setScalar(Math.max(0.01, blockScale));
        this._iceWire.material.opacity = blockOpacity * 0.5;
        this._iceWire.position.copy(orig);

        // Ice block shimmer
        if (blockScale > 0.1) {
            this._iceBlock.rotation.y = Math.sin(time * 0.5) * 0.05;
            this._iceWire.rotation.y = this._iceBlock.rotation.y;
        }

        // Update vapor particles
        for (var vi = 0; vi < this._vapor.length; vi++) {
            var v = this._vapor[vi];
            if (!v.active || v.life <= 0) continue;
            v.life -= delta;
            if (v.life <= 0) { v.mesh.visible = false; v.active = false; continue; }

            // Rise and spread
            v.mesh.position.x += v.vx * delta + Math.sin(time * 2 + v.driftPhase) * 0.003;
            v.mesh.position.y += v.vy * delta;
            // Expand as they rise
            var age = 1 - v.life / v.maxLife;
            v.mesh.scale.setScalar(v.size * (1 + age * 2));

            // Opacity: fade in quickly, sustain, fade out
            var lr = v.life / v.maxLife;
            if (lr > 0.8) {
                v.mesh.material.opacity = (1 - lr) / 0.2 * 0.3;
            } else if (lr > 0.2) {
                v.mesh.material.opacity = 0.3;
            } else {
                v.mesh.material.opacity = lr / 0.2 * 0.3;
            }

            // Dispersal in final phase - vapor spreads more
            if (progress >= 0.82) {
                v.vx *= 1.01;
                v.mesh.material.opacity *= 0.98;
            }
        }

        // Update frost sparkles
        for (var fi = 0; fi < this._frost.length; fi++) {
            var fr = this._frost[fi];
            if (fr.life <= 0) continue;
            fr.life -= delta;
            if (fr.life <= 0) { fr.mesh.visible = false; continue; }
            fr.mesh.position.x += fr.vx * delta;
            fr.mesh.position.y += fr.vy * delta;
            var flr = fr.life / fr.maxLife;
            fr.mesh.material.opacity = flr * 0.7;
            fr.mesh.scale.setScalar(0.5 + (1 - flr) * 0.5);
        }

        // Temperature glow - blue to white as sublimation progresses
        var tempInt = 0;
        if (progress < 0.12) {
            tempInt = progress / 0.12 * 0.08;
        } else if (progress < 0.65) {
            var heatup = (progress - 0.12) / 0.53;
            tempInt = 0.08 + heatup * 0.12;
            // Color shift blue to white
            var r = 0.4 + heatup * 0.6;
            var g = 0.6 + heatup * 0.4;
            var b = 1;
            this._tempGlow.material.color.setRGB(r, g, b);
        } else if (progress < 0.82) {
            tempInt = 0.2 * (1 - (progress - 0.65) / 0.17 * 0.5);
            this._tempGlow.material.color.setRGB(1, 1, 1);
        } else {
            tempInt = 0.1 * (1 - (progress - 0.82) / 0.18);
        }
        this._tempGlow.material.opacity = tempInt;
        this._tempGlow.position.copy(orig);
        this._tempGlow.scale.setScalar(1 + (1 - blockScale) * 0.5);

        // Model visibility - encased in ice initially, emerges
        if (progress < 0.35) {
            // Slightly frozen look - subtle shake
            var freeze = Math.sin(time * 8) * 0.002 * blockScale;
            model.position.set(orig.x + freeze, orig.y, orig.z);
        } else if (progress < 0.82) {
            // Emerging, gentle movement
            var emergeT = Math.min(1, (progress - 0.35) / 0.30);
            model.position.set(
                orig.x + Math.sin(time * 1.5) * 0.01 * emergeT,
                orig.y + Math.sin(time * 1.2) * 0.015 * emergeT,
                orig.z
            );
        } else {
            // Settle back
            var settleT = (progress - 0.82) / 0.18;
            model.position.set(
                orig.x + Math.sin(time * 1.5) * 0.01 * (1 - settleT),
                orig.y + Math.sin(time * 1.2) * 0.015 * (1 - settleT),
                orig.z
            );
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._iceBlock) { scene.remove(this._iceBlock); this._iceBlock.geometry.dispose(); this._iceBlock.material.dispose(); }
        if (this._iceWire) { scene.remove(this._iceWire); this._iceWire.geometry.dispose(); this._iceWire.material.dispose(); }
        if (this._vapor) {
            this._vapor.forEach(function(v) {
                scene.remove(v.mesh); v.mesh.geometry.dispose(); v.mesh.material.dispose();
            });
        }
        if (this._frost) {
            this._frost.forEach(function(f) {
                scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose();
            });
        }
        if (this._tempGlow) { scene.remove(this._tempGlow); this._tempGlow.geometry.dispose(); this._tempGlow.material.dispose(); }
        this._iceBlock = this._iceWire = this._vapor = this._frost = this._tempGlow = null;
    }
};
