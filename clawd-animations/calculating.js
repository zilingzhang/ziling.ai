export default {
    name: 'Calculating',
    label: 'calculating',
    duration: 10,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Matrix rain columns - small falling box particles
        this._rainParticles = [];
        var boxGeo = new THREE.BoxGeometry(0.03, 0.03, 0.03);
        for (var i = 0; i < 40; i++) {
            var col = i % 8;
            var rMat = new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0x00ff88 : (i % 3 === 1 ? 0x00ddaa : 0x44ffcc),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var box = new THREE.Mesh(boxGeo, rMat);
            var colX = (col - 3.5) * 0.28;
            box.position.set(colX, 1.5 + Math.random() * 1.0, -0.3);
            box.visible = false;
            scene.add(box);
            this._rainParticles.push({
                mesh: box,
                colX: colX,
                speed: 1.0 + Math.random() * 1.5,
                delay: Math.random() * 2.0,
                resetY: 1.5 + Math.random() * 0.5
            });
        }

        // Orbiting symbol cubes (equation elements)
        this._symbols = [];
        var symGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
        var symColors = [0x00ffaa, 0x44ff88, 0x88ffcc, 0x00ff66, 0x22ddff, 0x66ffaa, 0x00ccff, 0xaaffdd];
        for (var j = 0; j < 8; j++) {
            var symMat = new THREE.MeshBasicMaterial({
                color: symColors[j],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var sym = new THREE.Mesh(symGeo, symMat);
            sym.visible = false;
            scene.add(sym);
            this._symbols.push({
                mesh: sym,
                angle: (j / 8) * Math.PI * 2,
                radius: 0.5 + (j % 3) * 0.15,
                speed: 1.5 + (j % 4) * 0.3,
                yOffset: (j % 2 === 0 ? 0.05 : -0.05)
            });
        }

        // Central glow sphere
        var glowGeo = new THREE.SphereGeometry(0.5, 16, 16);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0x00ff88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glow = new THREE.Mesh(glowGeo, glowMat);
        this._glow.position.copy(this._origPos);
        scene.add(this._glow);

        // Flash sphere for result
        var flashGeo = new THREE.SphereGeometry(0.8, 16, 16);
        var flashMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._flash = new THREE.Mesh(flashGeo, flashMat);
        this._flash.position.copy(this._origPos);
        scene.add(this._flash);
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var intensity = 0;

        if (progress < 0.10) {
            // Phase 1: columns appear
            intensity = progress / 0.10;
        } else if (progress < 0.60) {
            // Phase 2: full matrix rain, orbiting symbols
            intensity = 1;
        } else if (progress < 0.80) {
            // Phase 3: symbols converge
            intensity = 1;
        } else {
            // Phase 4: flash and fade
            intensity = 1 - (progress - 0.80) / 0.20;
        }

        // Model subtle vibration during calculation
        var vibrate = intensity * Math.sin(time * 20) * 0.005;
        model.position.set(orig.x + vibrate, orig.y, orig.z);

        // Update rain particles
        for (var i = 0; i < this._rainParticles.length; i++) {
            var p = this._rainParticles[i];
            if (progress < 0.10) {
                // Fade in based on delay
                var fadeIn = Math.max(0, (progress / 0.10) - p.delay * 0.3);
                p.mesh.visible = fadeIn > 0;
                p.mesh.material.opacity = Math.min(fadeIn, 0.7) * intensity;
            } else if (progress < 0.80) {
                p.mesh.visible = true;
                p.mesh.position.y -= p.speed * delta;
                if (p.mesh.position.y < -1.5) {
                    p.mesh.position.y = p.resetY;
                }
                p.mesh.material.opacity = 0.4 + Math.sin(time * 5 + i) * 0.2;
                p.mesh.rotation.z += delta * 2;
            } else {
                // Fade out
                p.mesh.material.opacity *= 0.95;
                p.mesh.position.y -= p.speed * delta * 0.5;
                if (p.mesh.material.opacity < 0.01) p.mesh.visible = false;
            }
        }

        // Update orbiting symbols
        var converge = 0;
        if (progress >= 0.60 && progress < 0.80) {
            converge = (progress - 0.60) / 0.20;
        } else if (progress >= 0.80) {
            converge = 1;
        }

        for (var j = 0; j < this._symbols.length; j++) {
            var s = this._symbols[j];
            if (progress < 0.10) {
                s.mesh.visible = false;
            } else if (progress < 0.80) {
                s.mesh.visible = true;
                var currentRadius = s.radius * (1 - converge * 0.85);
                var a = s.angle + time * s.speed;
                s.mesh.position.set(
                    orig.x + Math.cos(a) * currentRadius,
                    orig.y + Math.sin(a) * currentRadius + s.yOffset,
                    0.1
                );
                s.mesh.material.opacity = Math.min(1, (progress - 0.10) / 0.10) * 0.8;
                s.mesh.rotation.x += delta * 3;
                s.mesh.rotation.y += delta * 2;
            } else {
                s.mesh.material.opacity *= 0.9;
                if (s.mesh.material.opacity < 0.01) s.mesh.visible = false;
            }
        }

        // Central glow - builds up with calculation
        var glowIntensity = 0;
        if (progress >= 0.10 && progress < 0.60) {
            glowIntensity = (progress - 0.10) / 0.50 * 0.15;
        } else if (progress >= 0.60 && progress < 0.80) {
            glowIntensity = 0.15 + converge * 0.2;
        } else if (progress >= 0.80) {
            glowIntensity = 0.35 * (1 - (progress - 0.80) / 0.20);
        }
        this._glow.position.set(model.position.x, model.position.y, -0.1);
        this._glow.material.opacity = glowIntensity + Math.sin(time * 3) * 0.02;
        this._glow.scale.setScalar(1 + Math.sin(time * 2) * 0.08);

        // Result flash
        var flashOp = 0;
        if (progress >= 0.78 && progress < 0.88) {
            var flashT = (progress - 0.78) / 0.10;
            flashOp = flashT < 0.3 ? flashT / 0.3 : (1 - (flashT - 0.3) / 0.7);
            flashOp *= 0.6;
        }
        this._flash.material.opacity = flashOp;
        this._flash.position.copy(this._glow.position);
        this._flash.scale.setScalar(1 + flashOp * 2);

        // Settle model at end
        if (progress >= 0.90) {
            var settle = (progress - 0.90) / 0.10;
            model.position.set(
                orig.x + vibrate * (1 - settle),
                orig.y,
                orig.z
            );
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._rainParticles) {
            this._rainParticles.forEach(function(p) {
                scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose();
            });
        }
        if (this._symbols) {
            this._symbols.forEach(function(s) {
                scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose();
            });
        }
        if (this._glow) { scene.remove(this._glow); this._glow.geometry.dispose(); this._glow.material.dispose(); }
        if (this._flash) { scene.remove(this._flash); this._flash.geometry.dispose(); this._flash.material.dispose(); }
        this._rainParticles = this._symbols = this._glow = this._flash = null;
    }
};
