export default {
    name: 'Cerebrating',
    label: 'cerebrating',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // 5 wave ring tori that pulse outward from head area
        this._waveRings = [];
        var ringColors = [0xff66aa, 0xcc44ff, 0x6644ff, 0x44aaff, 0xff88cc];
        for (var i = 0; i < 5; i++) {
            var ringGeo = new THREE.TorusGeometry(0.05, 0.012, 8, 32);
            var ringMat = new THREE.MeshBasicMaterial({
                color: ringColors[i],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.set(ox, oy + 0.15, 0);
            ring.rotation.x = Math.PI * 0.5;
            ring.visible = false;
            scene.add(ring);
            this._waveRings.push({
                mesh: ring,
                baseRadius: 0.05,
                expandSpeed: 0.6 + i * 0.15,
                currentRadius: 0.05,
                active: false,
                startTime: 0,
                phase: i
            });
        }

        // 15 neural pulse particles - tiny spheres that fire along paths
        this._neuralPulses = [];
        var pulseGeo = new THREE.SphereGeometry(0.015, 5, 5);
        var pulseColors = [0xff66cc, 0xaa44ff, 0x4488ff, 0xff44aa, 0x8844ff];
        for (var j = 0; j < 15; j++) {
            var pMat = new THREE.MeshBasicMaterial({
                color: pulseColors[j % 5],
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var pulse = new THREE.Mesh(pulseGeo, pMat);
            pulse.visible = false;
            scene.add(pulse);
            this._neuralPulses.push({
                mesh: pulse,
                life: 0, maxLife: 0,
                pathPoints: [],
                pathProgress: 0,
                speed: 0
            });
        }
        this._pulseIdx = 0;

        // 6 synapse line geometries - zigzag connections
        this._synapses = [];
        for (var k = 0; k < 6; k++) {
            var synMat = new THREE.LineBasicMaterial({
                color: k % 2 === 0 ? 0xcc66ff : 0x6688ff,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending
            });
            var synPoints = [];
            var synSegs = 8;
            for (var s = 0; s <= synSegs; s++) {
                synPoints.push(new THREE.Vector3(0, 0, 0));
            }
            var synGeo = new THREE.BufferGeometry().setFromPoints(synPoints);
            var synLine = new THREE.Line(synGeo, synMat);
            synLine.visible = false;
            scene.add(synLine);

            // Random endpoints for each synapse path
            var angle1 = Math.random() * Math.PI * 2;
            var angle2 = Math.random() * Math.PI * 2;
            var dist1 = 0.15 + Math.random() * 0.2;
            var dist2 = 0.15 + Math.random() * 0.2;
            this._synapses.push({
                line: synLine,
                segments: synSegs,
                x1: ox + Math.cos(angle1) * dist1,
                y1: oy + 0.15 + Math.sin(angle1) * dist1 * 0.7,
                x2: ox + Math.cos(angle2) * dist2,
                y2: oy + 0.15 + Math.sin(angle2) * dist2 * 0.7,
                flickerPhase: Math.random() * Math.PI * 2
            });
        }

        // Brain glow aura sphere
        var auraGeo = new THREE.SphereGeometry(0.35, 16, 16);
        var auraMat = new THREE.MeshBasicMaterial({
            color: 0xaa44ff, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._aura = new THREE.Mesh(auraGeo, auraMat);
        this._aura.position.set(ox, oy + 0.1, -0.05);
        scene.add(this._aura);

        this._lastRingSpawn = 0;
        this._ringSpawnIdx = 0;
        this._lastPulseSpawn = 0;
    },
    _spawnNeuralPulse(ox, oy, time) {
        var p = this._neuralPulses[this._pulseIdx % this._neuralPulses.length];
        this._pulseIdx++;
        p.mesh.visible = true;
        p.life = 0.6 + Math.random() * 0.5;
        p.maxLife = p.life;
        p.pathProgress = 0;
        p.speed = 1.5 + Math.random() * 1.5;

        // Generate a zigzag path from a random start to random end around head
        var a1 = Math.random() * Math.PI * 2;
        var a2 = Math.random() * Math.PI * 2;
        var d1 = 0.05 + Math.random() * 0.1;
        var d2 = 0.2 + Math.random() * 0.2;
        var sx = ox + Math.cos(a1) * d1;
        var sy = oy + 0.15 + Math.sin(a1) * d1 * 0.7;
        var ex = ox + Math.cos(a2) * d2;
        var ey = oy + 0.15 + Math.sin(a2) * d2 * 0.7;

        p.pathPoints = [
            { x: sx, y: sy },
            { x: (sx + ex) * 0.5 + (Math.random() - 0.5) * 0.15, y: (sy + ey) * 0.5 + (Math.random() - 0.5) * 0.1 },
            { x: ex, y: ey }
        ];
        p.mesh.position.set(sx, sy, 0.05);
        p.mesh.material.opacity = 0.9;
    },
    _updateSynapseGeometry(synapse, time) {
        var positions = synapse.line.geometry.attributes.position;
        var seg = synapse.segments;
        for (var i = 0; i <= seg; i++) {
            var t = i / seg;
            var x = synapse.x1 + (synapse.x2 - synapse.x1) * t;
            var y = synapse.y1 + (synapse.y2 - synapse.y1) * t;
            // Zigzag offset
            var zigzag = Math.sin(t * Math.PI * 3 + time * 6 + synapse.flickerPhase) * 0.03 * Math.sin(t * Math.PI);
            var jitter = (Math.random() - 0.5) * 0.008;
            positions.setXYZ(i, x + jitter, y + zigzag + jitter, 0.02);
        }
        positions.needsUpdate = true;
    },
    update(model, scene, progress, time, delta, THREE) {
        var orig = this._origPos;
        var ox = orig.x;
        var oy = orig.y;
        var oz = orig.z;

        if (progress < 0.08) {
            // Phase 1: First brain wave ring emerges
            var t = progress / 0.08;
            // Activate first ring
            if (!this._waveRings[0].active) {
                this._waveRings[0].active = true;
                this._waveRings[0].mesh.visible = true;
                this._waveRings[0].startTime = time;
            }
            this._aura.material.opacity = t * 0.05;
            model.position.set(ox, oy + t * 0.01, oz);
        } else if (progress < 0.30) {
            // Phase 2: Neural pulses start firing
            var t2 = (progress - 0.08) / 0.22;
            this._aura.material.opacity = 0.05 + t2 * 0.08;

            // Spawn neural pulses
            if (time - this._lastPulseSpawn > 0.3) {
                this._spawnNeuralPulse(ox, oy, time);
                this._lastPulseSpawn = time;
            }

            // Activate more rings
            if (t2 > 0.3 && !this._waveRings[1].active) {
                this._waveRings[1].active = true;
                this._waveRings[1].mesh.visible = true;
                this._waveRings[1].startTime = time;
            }

            // Start showing synapses
            for (var si = 0; si < 3; si++) {
                if (t2 > 0.2 + si * 0.2) {
                    this._synapses[si].line.visible = true;
                    this._synapses[si].line.material.opacity = Math.min(0.4, (t2 - 0.2 - si * 0.2) * 2);
                    this._updateSynapseGeometry(this._synapses[si], time);
                }
            }

            model.position.set(ox, oy + 0.01 + Math.sin(time * 1.5) * 0.005, oz);
        } else if (progress < 0.65) {
            // Phase 3: Full cerebration - multiple wave rings + synaptic paths
            var t3 = (progress - 0.30) / 0.35;
            this._aura.material.opacity = 0.13 + Math.sin(time * 2.5) * 0.04;
            this._aura.scale.setScalar(1 + Math.sin(time * 2) * 0.1);

            // Activate all wave rings
            for (var ri = 0; ri < 5; ri++) {
                if (!this._waveRings[ri].active && t3 > ri * 0.15) {
                    this._waveRings[ri].active = true;
                    this._waveRings[ri].mesh.visible = true;
                    this._waveRings[ri].startTime = time;
                }
            }

            // Spawn neural pulses more frequently
            if (time - this._lastPulseSpawn > 0.15) {
                this._spawnNeuralPulse(ox, oy, time);
                this._lastPulseSpawn = time;
            }

            // All synapses active
            for (var sj = 0; sj < 6; sj++) {
                this._synapses[sj].line.visible = true;
                var flicker = 0.3 + Math.sin(time * 5 + sj * 1.5) * 0.2;
                this._synapses[sj].line.material.opacity = flicker;
                this._updateSynapseGeometry(this._synapses[sj], time);
            }

            model.position.set(ox, oy + 0.01 + Math.sin(time * 2) * 0.008, oz);
            model.rotation.z = Math.sin(time * 1.2) * 0.02;
        } else if (progress < 0.78) {
            // Phase 4: Peak activity - bright aura
            var t4 = (progress - 0.65) / 0.13;
            var peakPulse = Math.sin(t4 * Math.PI);
            this._aura.material.opacity = 0.15 + peakPulse * 0.15;
            this._aura.scale.setScalar(1.1 + peakPulse * 0.3);
            this._aura.material.color.setHex(0xcc66ff);

            // Rapid pulse spawning
            if (time - this._lastPulseSpawn > 0.08) {
                this._spawnNeuralPulse(ox, oy, time);
                this._spawnNeuralPulse(ox, oy, time);
                this._lastPulseSpawn = time;
            }

            // Synapses at max brightness
            for (var sk = 0; sk < 6; sk++) {
                this._synapses[sk].line.material.opacity = 0.5 + Math.sin(time * 8 + sk) * 0.2;
                this._updateSynapseGeometry(this._synapses[sk], time);
            }

            model.position.set(ox, oy + 0.015, oz);
            model.rotation.z = Math.sin(time * 2) * 0.03;
        } else if (progress < 0.90) {
            // Phase 5: Waves slow, neural activity eases
            var t5 = (progress - 0.78) / 0.12;
            this._aura.material.opacity = 0.2 * (1 - t5 * 0.6);
            this._aura.scale.setScalar(1.4 - t5 * 0.3);
            this._aura.material.color.setHex(0xaa44ff);

            // Synapses fade
            for (var sl = 0; sl < 6; sl++) {
                this._synapses[sl].line.material.opacity = (0.4 - t5 * 0.3);
                this._updateSynapseGeometry(this._synapses[sl], time);
            }

            model.position.set(ox, oy + 0.015 * (1 - t5), oz);
            model.rotation.z = Math.sin(time * 1.5) * 0.02 * (1 - t5);
        } else {
            // Phase 6: Rest
            var t6 = (progress - 0.90) / 0.10;
            this._aura.material.opacity = 0.08 * (1 - t6);
            this._aura.scale.setScalar(1.1 * (1 - t6 * 0.2));

            for (var sm = 0; sm < 6; sm++) {
                this._synapses[sm].line.material.opacity = 0.1 * (1 - t6);
            }

            // Deactivate rings
            for (var rj = 0; rj < 5; rj++) {
                this._waveRings[rj].mesh.material.opacity *= (1 - t6 * 0.1);
            }

            model.position.set(ox, oy, oz);
            model.rotation.z = 0;
            model.scale.copy(this._origScale);
        }

        // Update wave rings - expand outward and fade
        for (var wr = 0; wr < this._waveRings.length; wr++) {
            var ring = this._waveRings[wr];
            if (!ring.active) continue;

            var elapsed = time - ring.startTime;
            var cycleDuration = 2.0 + ring.phase * 0.3;
            var cycleT = (elapsed % cycleDuration) / cycleDuration;

            ring.currentRadius = ring.baseRadius + cycleT * ring.expandSpeed;
            ring.mesh.scale.setScalar(ring.currentRadius / ring.baseRadius);
            ring.mesh.material.opacity = (1 - cycleT) * 0.5;

            // Reset ring when it finishes expanding
            if (cycleT > 0.95 && progress < 0.85) {
                ring.startTime = time;
            }

            ring.mesh.rotation.z += delta * 0.5;
        }

        // Update neural pulses along paths
        for (var np = 0; np < this._neuralPulses.length; np++) {
            var pp = this._neuralPulses[np];
            if (pp.life <= 0) continue;
            pp.life -= delta;
            if (pp.life <= 0) { pp.mesh.visible = false; continue; }

            pp.pathProgress += pp.speed * delta;
            var pathT = Math.min(pp.pathProgress, 1);

            // Interpolate along path points
            if (pp.pathPoints.length >= 3) {
                var segT;
                var px, py;
                if (pathT < 0.5) {
                    segT = pathT / 0.5;
                    px = pp.pathPoints[0].x + (pp.pathPoints[1].x - pp.pathPoints[0].x) * segT;
                    py = pp.pathPoints[0].y + (pp.pathPoints[1].y - pp.pathPoints[0].y) * segT;
                } else {
                    segT = (pathT - 0.5) / 0.5;
                    px = pp.pathPoints[1].x + (pp.pathPoints[2].x - pp.pathPoints[1].x) * segT;
                    py = pp.pathPoints[1].y + (pp.pathPoints[2].y - pp.pathPoints[1].y) * segT;
                }
                pp.mesh.position.set(px, py, 0.05);
            }

            var lr = pp.life / pp.maxLife;
            pp.mesh.material.opacity = lr * 0.8;
            pp.mesh.scale.setScalar(0.5 + (1 - lr) * 0.8);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._waveRings) {
            this._waveRings.forEach(function(r) {
                scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose();
            });
        }
        if (this._neuralPulses) {
            this._neuralPulses.forEach(function(p) {
                scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose();
            });
        }
        if (this._synapses) {
            this._synapses.forEach(function(s) {
                scene.remove(s.line); s.line.geometry.dispose(); s.line.material.dispose();
            });
        }
        if (this._aura) { scene.remove(this._aura); this._aura.geometry.dispose(); this._aura.material.dispose(); }
        this._waveRings = this._neuralPulses = this._synapses = this._aura = null;
    }
};
