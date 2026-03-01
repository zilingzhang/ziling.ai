export default {
    name: 'Envisioning',
    label: 'envisioning',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Eye shape - two arc line geometries
        this._eyeArcs = [];
        var arcPoints = 20;
        // Upper arc
        var upperPts = [];
        for (var i = 0; i < arcPoints; i++) {
            var t = i / (arcPoints - 1);
            var angle = Math.PI * 0.2 + t * Math.PI * 0.6;
            upperPts.push(new THREE.Vector3(
                ox - 0.3 + Math.cos(angle) * 0.08,
                oy + 0.12 + Math.sin(angle) * 0.04,
                0.01
            ));
        }
        var upperGeo = new THREE.BufferGeometry().setFromPoints(upperPts);
        var upperMat = new THREE.LineBasicMaterial({
            color: 0xaa88ff, transparent: true, opacity: 0
        });
        var upperArc = new THREE.Line(upperGeo, upperMat);
        scene.add(upperArc);
        this._eyeArcs.push(upperArc);

        // Lower arc
        var lowerPts = [];
        for (var j = 0; j < arcPoints; j++) {
            var t2 = j / (arcPoints - 1);
            var angle2 = -Math.PI * 0.2 - t2 * Math.PI * 0.6;
            lowerPts.push(new THREE.Vector3(
                ox - 0.3 + Math.cos(angle2) * 0.08,
                oy + 0.12 + Math.sin(angle2) * 0.04,
                0.01
            ));
        }
        var lowerGeo = new THREE.BufferGeometry().setFromPoints(lowerPts);
        var lowerMat = new THREE.LineBasicMaterial({
            color: 0xaa88ff, transparent: true, opacity: 0
        });
        var lowerArc = new THREE.Line(lowerGeo, lowerMat);
        scene.add(lowerArc);
        this._eyeArcs.push(lowerArc);

        // Iris sphere
        var irisGeo = new THREE.SphereGeometry(0.025, 10, 10);
        var irisMat = new THREE.MeshBasicMaterial({
            color: 0x8844ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._iris = new THREE.Mesh(irisGeo, irisMat);
        this._iris.position.set(ox - 0.3, oy + 0.12, 0.02);
        scene.add(this._iris);

        // Vision beam (cone of particles)
        this._beamParticles = [];
        var beamGeo = new THREE.SphereGeometry(0.008, 4, 4);
        for (var bi = 0; bi < 30; bi++) {
            var bMat = new THREE.MeshBasicMaterial({
                color: bi % 3 === 0 ? 0xaa88ff : (bi % 3 === 1 ? 0xccaaff : 0x8866dd),
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var bp = new THREE.Mesh(beamGeo, bMat);
            bp.visible = false;
            scene.add(bp);
            this._beamParticles.push({
                mesh: bp, life: 0, maxLife: 0,
                vx: 0, vy: 0, phase: Math.random() * Math.PI * 2
            });
        }
        this._beamIdx = 0;

        // Holographic vision shapes (wireframe geometries that materialize)
        this._visions = [];
        var visionDefs = [
            { geo: new THREE.BoxGeometry(0.08, 0.08, 0.08), color: 0xccaaff },
            { geo: new THREE.SphereGeometry(0.05, 8, 8), color: 0xaa88ff },
            { geo: new THREE.OctahedronGeometry(0.05, 0), color: 0xddbbff },
            { geo: new THREE.TorusGeometry(0.04, 0.015, 6, 12), color: 0x9977ee },
            { geo: new THREE.IcosahedronGeometry(0.045, 0), color: 0xbb99ff }
        ];
        for (var vi = 0; vi < visionDefs.length; vi++) {
            var vMat = new THREE.MeshBasicMaterial({
                color: visionDefs[vi].color,
                transparent: true, opacity: 0,
                wireframe: true
            });
            var vision = new THREE.Mesh(visionDefs[vi].geo, vMat);
            vision.position.set(ox + 0.1, oy + 0.05, 0.03);
            vision.visible = false;
            scene.add(vision);
            this._visions.push({
                mesh: vision,
                rotSpeed: { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 },
                cycleStart: vi * 0.12,
                cycleEnd: vi * 0.12 + 0.10
            });
        }

        // Future-sight glow
        var glowGeo = new THREE.SphereGeometry(0.25, 12, 12);
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0x8855cc, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._glow = new THREE.Mesh(glowGeo, glowMat);
        this._glow.position.set(ox + 0.1, oy + 0.05, -0.05);
        scene.add(this._glow);

        this._activeVision = 0;
        this._lastBeam = 0;
    },
    _emitBeam(x, y, dirX, dirY) {
        var b = this._beamParticles[this._beamIdx % this._beamParticles.length];
        this._beamIdx++;
        b.mesh.visible = true;
        b.mesh.position.set(x, y, 0.02);
        var spread = (Math.random() - 0.5) * 0.3;
        b.vx = dirX * (0.8 + Math.random() * 0.5) + spread * Math.abs(dirY);
        b.vy = dirY * (0.8 + Math.random() * 0.5) + spread * Math.abs(dirX);
        b.life = 0.3 + Math.random() * 0.3;
        b.maxLife = b.life;
        b.mesh.material.opacity = 0.6;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        if (progress < 0.10) {
            // Phase 1: Eye shape forms
            var t = progress / 0.10;
            for (var ai = 0; ai < this._eyeArcs.length; ai++) {
                this._eyeArcs[ai].material.opacity = t * 0.6;
            }
            this._iris.material.opacity = t * 0.7;
            this._iris.scale.setScalar(t);
            model.position.set(ox, oy, oz);
        } else if (progress < 0.25) {
            // Phase 2: Vision beam projects forward
            var t2 = (progress - 0.10) / 0.15;
            for (var ai2 = 0; ai2 < this._eyeArcs.length; ai2++) {
                this._eyeArcs[ai2].material.opacity = 0.6;
            }
            this._iris.material.opacity = 0.7 + Math.sin(time * 4) * 0.15;
            this._iris.scale.setScalar(1.0 + Math.sin(time * 3) * 0.1);

            // Emit beam particles from eye toward vision area
            if (time - this._lastBeam > 0.04) {
                this._emitBeam(ox - 0.3, oy + 0.12, 1.5, -0.2);
                this._lastBeam = time;
            }

            model.position.set(ox, oy, oz);
        } else if (progress < 0.75) {
            // Phase 3: Holographic images materialize, cycling visions
            var t3 = (progress - 0.25) / 0.50;
            this._iris.material.opacity = 0.7 + Math.sin(time * 4) * 0.15;

            // Continuous beam
            if (time - this._lastBeam > 0.05) {
                this._emitBeam(ox - 0.3, oy + 0.12, 1.5, -0.2);
                this._lastBeam = time;
            }

            // Cycle through visions
            var cycleT = (t3 * 3) % 1;
            this._activeVision = Math.floor(t3 * 3) % this._visions.length;

            for (var vi = 0; vi < this._visions.length; vi++) {
                var v = this._visions[vi];
                if (vi === this._activeVision) {
                    v.mesh.visible = true;
                    var vFade = cycleT < 0.15 ? cycleT / 0.15 : (cycleT > 0.85 ? (1 - cycleT) / 0.15 : 1);
                    v.mesh.material.opacity = vFade * 0.5;
                    v.mesh.scale.setScalar(0.5 + vFade * 0.8);
                    v.mesh.rotation.x += delta * v.rotSpeed.x;
                    v.mesh.rotation.y += delta * v.rotSpeed.y;
                    // Holographic scan lines effect via position jitter
                    v.mesh.position.y = oy + 0.05 + Math.sin(time * 8) * 0.003;
                } else {
                    v.mesh.visible = false;
                }
            }

            this._glow.material.opacity = 0.08 + Math.sin(time * 2) * 0.03;
            this._glow.scale.setScalar(1 + Math.sin(time * 1.5) * 0.15);

            model.position.set(ox, oy + Math.sin(time * 1) * 0.005, oz);
        } else if (progress < 0.90) {
            // Phase 4: All visions combine in a burst
            var t4 = (progress - 0.75) / 0.15;
            var burst = Math.sin(t4 * Math.PI);

            for (var vi2 = 0; vi2 < this._visions.length; vi2++) {
                this._visions[vi2].mesh.visible = true;
                this._visions[vi2].mesh.material.opacity = burst * 0.4;
                this._visions[vi2].mesh.scale.setScalar(1.0 + burst * 0.3);
                this._visions[vi2].mesh.rotation.x += delta * this._visions[vi2].rotSpeed.x;
                this._visions[vi2].mesh.rotation.y += delta * this._visions[vi2].rotSpeed.y;
                // Spread them slightly
                var spreadAngle = (vi2 / this._visions.length) * Math.PI * 2;
                this._visions[vi2].mesh.position.set(
                    ox + 0.1 + Math.cos(spreadAngle) * burst * 0.06,
                    oy + 0.05 + Math.sin(spreadAngle) * burst * 0.06,
                    0.03
                );
            }

            this._glow.material.opacity = burst * 0.2;
            this._glow.scale.setScalar(1.3 + burst * 0.5);
            this._iris.material.opacity = 0.7 + burst * 0.3;

            model.position.set(ox, oy, oz);
        } else {
            // Phase 5: Fade out
            var t5 = (progress - 0.90) / 0.10;
            var fadeOut = 1 - t5;
            for (var ai3 = 0; ai3 < this._eyeArcs.length; ai3++) {
                this._eyeArcs[ai3].material.opacity = 0.6 * fadeOut;
            }
            this._iris.material.opacity = 0.7 * fadeOut;
            for (var vi3 = 0; vi3 < this._visions.length; vi3++) {
                this._visions[vi3].mesh.material.opacity *= fadeOut;
            }
            this._glow.material.opacity *= fadeOut;
            model.position.set(ox, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update beam particles
        for (var bpi = 0; bpi < this._beamParticles.length; bpi++) {
            var bp = this._beamParticles[bpi];
            if (bp.life <= 0) continue;
            bp.life -= delta;
            if (bp.life <= 0) { bp.mesh.visible = false; continue; }
            bp.mesh.position.x += bp.vx * delta;
            bp.mesh.position.y += bp.vy * delta;
            bp.mesh.position.y += Math.sin(time * 6 + bp.phase) * 0.002;
            var lr = bp.life / bp.maxLife;
            bp.mesh.material.opacity = lr * 0.5;
            bp.mesh.scale.setScalar(0.5 + (1 - lr) * 0.8);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._eyeArcs) {
            this._eyeArcs.forEach(function(a) { scene.remove(a); a.geometry.dispose(); a.material.dispose(); });
        }
        if (this._iris) { scene.remove(this._iris); this._iris.geometry.dispose(); this._iris.material.dispose(); }
        if (this._beamParticles) {
            this._beamParticles.forEach(function(b) { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); });
        }
        if (this._visions) {
            this._visions.forEach(function(v) { scene.remove(v.mesh); v.mesh.geometry.dispose(); v.mesh.material.dispose(); });
        }
        if (this._glow) { scene.remove(this._glow); this._glow.geometry.dispose(); this._glow.material.dispose(); }
        this._eyeArcs = this._iris = this._beamParticles = this._visions = this._glow = null;
    }
};
