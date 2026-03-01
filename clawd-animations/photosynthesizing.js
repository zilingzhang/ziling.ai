export default {
    name: 'Photosynthesizing',
    label: 'photosynthesizing',
    duration: 12,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        // Sun sphere - top right
        var sunGeo = new THREE.SphereGeometry(0.15, 16, 16);
        var sunMat = new THREE.MeshBasicMaterial({
            color: 0xffcc33, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._sun = new THREE.Mesh(sunGeo, sunMat);
        this._sun.position.set(this._origPos.x + 1.0, this._origPos.y + 0.8, -0.2);
        scene.add(this._sun);

        // Sun corona glow
        var coronaGeo = new THREE.SphereGeometry(0.25, 16, 16);
        var coronaMat = new THREE.MeshBasicMaterial({
            color: 0xffdd44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._corona = new THREE.Mesh(coronaGeo, coronaMat);
        this._corona.position.copy(this._sun.position);
        scene.add(this._corona);

        // Sun rays - thin cylinders from sun toward model
        this._rays = [];
        var rayGeo = new THREE.CylinderGeometry(0.008, 0.008, 1.0, 4);
        for (var r = 0; r < 6; r++) {
            var rayMat = new THREE.MeshBasicMaterial({
                color: r % 2 === 0 ? 0xffdd55 : 0xffcc33,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ray = new THREE.Mesh(rayGeo, rayMat);
            ray.visible = false;
            scene.add(ray);

            // Calculate angle from sun to slightly different points near model
            var targetX = this._origPos.x + (r - 2.5) * 0.08;
            var targetY = this._origPos.y + (r % 3 - 1) * 0.06;
            var dx = targetX - this._sun.position.x;
            var dy = targetY - this._sun.position.y;
            var angle = Math.atan2(dx, dy);
            var length = Math.sqrt(dx * dx + dy * dy);

            this._rays.push({
                mesh: ray,
                angle: angle,
                length: length,
                midX: (this._sun.position.x + targetX) / 2,
                midY: (this._sun.position.y + targetY) / 2,
                shimmerPhase: r * 0.5
            });
        }

        // Leaf discs - green flat circles that sprout
        this._leaves = [];
        var leafGeo = new THREE.CircleGeometry(0.05, 8);
        for (var l = 0; l < 8; l++) {
            var leafMat = new THREE.MeshBasicMaterial({
                color: l % 3 === 0 ? 0x33cc44 : (l % 3 === 1 ? 0x44dd55 : 0x22bb33),
                transparent: true, opacity: 0,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var leaf = new THREE.Mesh(leafGeo, leafMat);
            leaf.visible = false;
            scene.add(leaf);

            var leafAngle = (l / 8) * Math.PI * 2;
            var leafDist = 0.18 + (l % 3) * 0.08;
            this._leaves.push({
                mesh: leaf,
                targetX: this._origPos.x + Math.cos(leafAngle) * leafDist,
                targetY: this._origPos.y + Math.sin(leafAngle) * leafDist * 0.6,
                targetScale: 0.6 + Math.random() * 0.8,
                growStart: 0.30 + (l / 8) * 0.15,
                wobblePhase: Math.random() * Math.PI * 2,
                rotAngle: leafAngle + Math.PI / 4
            });
        }

        // O2 bubble particles - light blue, float upward
        this._bubbles = [];
        var bubGeo = new THREE.SphereGeometry(0.02, 6, 6);
        for (var b = 0; b < 20; b++) {
            var bubMat = new THREE.MeshBasicMaterial({
                color: b % 3 === 0 ? 0x88ddff : (b % 3 === 1 ? 0xaaeeff : 0x66ccee),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var bub = new THREE.Mesh(bubGeo, bubMat);
            bub.visible = false;
            scene.add(bub);
            this._bubbles.push({
                mesh: bub,
                life: 0,
                maxLife: 0,
                vx: 0, vy: 0,
                wobblePhase: Math.random() * Math.PI * 2
            });
        }
        this._bubIdx = 0;

        // Green glow aura around model
        var auraGeo = new THREE.SphereGeometry(0.45, 16, 16);
        var auraMat = new THREE.MeshBasicMaterial({
            color: 0x33dd44, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._aura = new THREE.Mesh(auraGeo, auraMat);
        this._aura.position.copy(this._origPos);
        scene.add(this._aura);

        // Green energy particles rising from model
        this._energyParticles = [];
        var engGeo = new THREE.SphereGeometry(0.012, 4, 4);
        for (var e = 0; e < 12; e++) {
            var eMat = new THREE.MeshBasicMaterial({
                color: e % 2 === 0 ? 0x44ff66 : 0x66ff88,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var eng = new THREE.Mesh(engGeo, eMat);
            eng.visible = false;
            scene.add(eng);
            this._energyParticles.push({
                mesh: eng,
                life: 0,
                maxLife: 0,
                vx: 0, vy: 0
            });
        }
        this._engIdx = 0;
    },
    _emitBubble(x, y) {
        var b = this._bubbles[this._bubIdx % this._bubbles.length];
        this._bubIdx++;
        b.mesh.visible = true;
        b.mesh.position.set(x + (Math.random() - 0.5) * 0.15, y, 0.05);
        b.vx = (Math.random() - 0.5) * 0.15;
        b.vy = 0.3 + Math.random() * 0.3;
        b.life = 1.5 + Math.random() * 1.0;
        b.maxLife = b.life;
        b.mesh.material.opacity = 0.5;
        b.mesh.scale.setScalar(0.5 + Math.random() * 0.8);
    },
    _emitEnergy(x, y) {
        var e = this._energyParticles[this._engIdx % this._energyParticles.length];
        this._engIdx++;
        e.mesh.visible = true;
        e.mesh.position.set(x + (Math.random() - 0.5) * 0.1, y, 0.05);
        e.vx = (Math.random() - 0.5) * 0.1;
        e.vy = 0.4 + Math.random() * 0.3;
        e.life = 0.8 + Math.random() * 0.5;
        e.maxLife = e.life;
        e.mesh.material.opacity = 0.7;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;

        // Sun appearance
        if (progress < 0.10) {
            var sunFade = progress / 0.10;
            this._sun.material.opacity = sunFade * 0.9;
            this._corona.material.opacity = sunFade * 0.3;
        } else if (progress < 0.85) {
            this._sun.material.opacity = 0.9;
            this._corona.material.opacity = 0.3 + Math.sin(time * 2) * 0.08;
            this._corona.scale.setScalar(1 + Math.sin(time * 1.5) * 0.1);
        } else {
            // Sun dims
            var dimT = (progress - 0.85) / 0.15;
            this._sun.material.opacity = 0.9 * (1 - dimT);
            this._corona.material.opacity = 0.3 * (1 - dimT);
        }

        // Sun rays
        var rayIntensity = 0;
        if (progress >= 0.05 && progress < 0.10) {
            rayIntensity = (progress - 0.05) / 0.05;
        } else if (progress >= 0.10 && progress < 0.85) {
            rayIntensity = 1;
        } else if (progress >= 0.85) {
            rayIntensity = 1 - (progress - 0.85) / 0.15;
        }

        for (var r = 0; r < this._rays.length; r++) {
            var ray = this._rays[r];
            if (rayIntensity > 0) {
                ray.mesh.visible = true;
                ray.mesh.position.set(ray.midX, ray.midY, -0.1);
                ray.mesh.rotation.z = -ray.angle;
                ray.mesh.scale.set(1, ray.length, 1);
                var shimmer = Math.sin(time * 3 + ray.shimmerPhase) * 0.15 + 0.35;
                ray.mesh.material.opacity = shimmer * rayIntensity;
            } else {
                ray.mesh.visible = false;
            }
        }

        // Green glow on model - builds as rays hit
        var greenGlow = 0;
        if (progress >= 0.10 && progress < 0.30) {
            greenGlow = (progress - 0.10) / 0.20 * 0.1;
        } else if (progress >= 0.30 && progress < 0.70) {
            greenGlow = 0.1 + (progress - 0.30) / 0.40 * 0.1;
        } else if (progress >= 0.70 && progress < 0.85) {
            // Maximum green glow burst
            greenGlow = 0.2 + Math.sin(time * 3) * 0.05;
        } else if (progress >= 0.85) {
            greenGlow = 0.2 * (1 - (progress - 0.85) / 0.15);
        }
        this._aura.material.opacity = greenGlow;
        this._aura.position.set(orig.x, orig.y, -0.1);
        this._aura.scale.setScalar(1 + greenGlow * 2 + Math.sin(time * 1.8) * 0.05);

        // Leaves grow
        for (var l = 0; l < this._leaves.length; l++) {
            var leaf = this._leaves[l];
            if (progress < leaf.growStart) {
                leaf.mesh.visible = false;
            } else if (progress < leaf.growStart + 0.10) {
                // Sprouting
                leaf.mesh.visible = true;
                var sproutT = (progress - leaf.growStart) / 0.10;
                var eased = sproutT * sproutT * (3 - 2 * sproutT);
                leaf.mesh.position.set(
                    orig.x + (leaf.targetX - orig.x) * eased,
                    orig.y + (leaf.targetY - orig.y) * eased,
                    0.05
                );
                leaf.mesh.scale.setScalar(leaf.targetScale * eased);
                leaf.mesh.material.opacity = eased * 0.6;
                leaf.mesh.rotation.z = leaf.rotAngle;
            } else if (progress < 0.85) {
                // Fully grown, gentle sway
                leaf.mesh.visible = true;
                leaf.mesh.position.set(leaf.targetX, leaf.targetY, 0.05);
                leaf.mesh.scale.setScalar(leaf.targetScale);
                leaf.mesh.material.opacity = 0.5 + Math.sin(time * 1.5 + leaf.wobblePhase) * 0.1;
                leaf.mesh.rotation.z = leaf.rotAngle + Math.sin(time * 1.2 + leaf.wobblePhase) * 0.1;
            } else {
                // Fade
                var leafFade = (progress - 0.85) / 0.15;
                leaf.mesh.material.opacity = 0.5 * (1 - leafFade);
                if (leaf.mesh.material.opacity < 0.01) leaf.mesh.visible = false;
            }
        }

        // O2 bubbles and energy particles
        if (progress >= 0.30 && progress < 0.85) {
            // Emit bubbles periodically
            if (Math.random() < 0.08) {
                this._emitBubble(orig.x, orig.y + 0.1);
            }
            // Emit green energy
            if (Math.random() < 0.06) {
                this._emitEnergy(orig.x, orig.y);
            }
        }
        // Energy burst at 70-85%
        if (progress >= 0.70 && progress < 0.85 && Math.random() < 0.15) {
            this._emitBubble(orig.x, orig.y + 0.05);
            this._emitEnergy(orig.x, orig.y);
        }

        // Update bubbles
        for (var bi = 0; bi < this._bubbles.length; bi++) {
            var bub = this._bubbles[bi];
            if (bub.life <= 0) continue;
            bub.life -= delta;
            if (bub.life <= 0) { bub.mesh.visible = false; continue; }
            bub.mesh.position.x += bub.vx * delta + Math.sin(time * 3 + bub.wobblePhase) * 0.002;
            bub.mesh.position.y += bub.vy * delta;
            var blr = bub.life / bub.maxLife;
            bub.mesh.material.opacity = blr * 0.5;
        }

        // Update energy particles
        for (var ei = 0; ei < this._energyParticles.length; ei++) {
            var eng = this._energyParticles[ei];
            if (eng.life <= 0) continue;
            eng.life -= delta;
            if (eng.life <= 0) { eng.mesh.visible = false; continue; }
            eng.mesh.position.x += eng.vx * delta;
            eng.mesh.position.y += eng.vy * delta;
            var elr = eng.life / eng.maxLife;
            eng.mesh.material.opacity = elr * 0.7;
            eng.mesh.scale.setScalar(0.5 + (1 - elr) * 0.5);
        }

        // Model gentle sway
        var swayAmt = 0;
        if (progress >= 0.10 && progress < 0.85) {
            swayAmt = Math.min(1, (progress - 0.10) / 0.10);
        } else if (progress >= 0.85) {
            swayAmt = 1 - (progress - 0.85) / 0.15;
        }
        model.position.set(
            orig.x + Math.sin(time * 0.8) * 0.01 * swayAmt,
            orig.y + Math.sin(time * 1.1) * 0.015 * swayAmt,
            0
        );

        // Settle
        if (progress >= 0.95) {
            model.position.copy(orig);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._sun) { scene.remove(this._sun); this._sun.geometry.dispose(); this._sun.material.dispose(); }
        if (this._corona) { scene.remove(this._corona); this._corona.geometry.dispose(); this._corona.material.dispose(); }
        if (this._rays) {
            this._rays.forEach(function(r) {
                scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose();
            });
        }
        if (this._leaves) {
            this._leaves.forEach(function(l) {
                scene.remove(l.mesh); l.mesh.geometry.dispose(); l.mesh.material.dispose();
            });
        }
        if (this._bubbles) {
            this._bubbles.forEach(function(b) {
                scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose();
            });
        }
        if (this._energyParticles) {
            this._energyParticles.forEach(function(e) {
                scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose();
            });
        }
        if (this._aura) { scene.remove(this._aura); this._aura.geometry.dispose(); this._aura.material.dispose(); }
        this._sun = this._corona = this._rays = this._leaves = null;
        this._bubbles = this._energyParticles = this._aura = null;
    }
};
