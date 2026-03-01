export default {
    name: 'Propagating',
    label: 'propagating',
    duration: 11,
    init(model, scene, THREE) {
        this._origPos = model.position.clone();
        this._origScale = model.scale.clone();

        var ox = this._origPos.x;
        var oy = this._origPos.y;

        // Concentric ring waves
        this._rings = [];
        for (var r = 0; r < 6; r++) {
            var rGeo = new THREE.RingGeometry(0.01, 0.02, 24);
            var rMat = new THREE.MeshBasicMaterial({
                color: r % 2 === 0 ? 0x44aacc : 0x55ccaa,
                transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false,
                side: THREE.DoubleSide
            });
            var ring = new THREE.Mesh(rGeo, rMat);
            ring.position.set(ox, oy, 0);
            scene.add(ring);
            this._rings.push({
                mesh: ring,
                active: false,
                radius: 0,
                maxRadius: 0.3 + r * 0.15,
                speed: 0.8,
                delay: r * 0.15
            });
        }

        // Relay node spheres
        this._nodes = [];
        var nodePositions = [];
        // Generate nodes in expanding pattern
        for (var layer = 0; layer < 4; layer++) {
            var nodesInLayer = 3 + layer * 2;
            var layerRadius = 0.25 + layer * 0.2;
            for (var ni = 0; ni < nodesInLayer; ni++) {
                var nAngle = (ni / nodesInLayer) * Math.PI * 2 + layer * 0.3;
                nodePositions.push({
                    x: Math.cos(nAngle) * layerRadius,
                    y: Math.sin(nAngle) * layerRadius * 0.6,
                    layer: layer
                });
            }
        }

        for (var np = 0; np < nodePositions.length; np++) {
            var pos = nodePositions[np];
            var nGeo = new THREE.SphereGeometry(0.02, 6, 6);
            var nMat = new THREE.MeshBasicMaterial({
                color: 0x66ddbb, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var node = new THREE.Mesh(nGeo, nMat);
            node.position.set(ox + pos.x, oy + pos.y, 0);
            scene.add(node);

            // Node glow
            var ngGeo = new THREE.SphereGeometry(0.04, 6, 6);
            var ngMat = new THREE.MeshBasicMaterial({
                color: 0x44aa88, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false,
                side: THREE.BackSide
            });
            var nodeGlow = new THREE.Mesh(ngGeo, ngMat);
            nodeGlow.position.set(ox + pos.x, oy + pos.y, 0);
            scene.add(nodeGlow);

            this._nodes.push({
                mesh: node, glow: nodeGlow,
                x: pos.x, y: pos.y,
                layer: pos.layer,
                lit: false, litTime: 0,
                dist: Math.sqrt(pos.x * pos.x + pos.y * pos.y)
            });
        }

        // Connection lines (drawn between activated nodes)
        this._connections = [];
        var connGeo = new THREE.BoxGeometry(0.1, 0.003, 0.001);
        for (var cn = 0; cn < 20; cn++) {
            var cnMat = new THREE.MeshBasicMaterial({
                color: 0x55ccaa, transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            var conn = new THREE.Mesh(connGeo, cnMat);
            conn.visible = false;
            scene.add(conn);
            this._connections.push({
                mesh: conn, life: 0, maxLife: 0
            });
        }
        this._connIdx = 0;

        // Center pulse source
        var srcGeo = new THREE.SphereGeometry(0.05, 10, 10);
        var srcMat = new THREE.MeshBasicMaterial({
            color: 0x88ffcc, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        this._source = new THREE.Mesh(srcGeo, srcMat);
        this._source.position.set(ox, oy, 0);
        scene.add(this._source);

        // Cascade glow
        var cascGeo = new THREE.SphereGeometry(0.5, 10, 10);
        var cascMat = new THREE.MeshBasicMaterial({
            color: 0x44aa88, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
            side: THREE.BackSide
        });
        this._cascadeGlow = new THREE.Mesh(cascGeo, cascMat);
        this._cascadeGlow.position.set(ox, oy, 0);
        scene.add(this._cascadeGlow);

        this._waveTime = 0;
        this._pulseCount = 0;
    },
    _spawnConnection(ox, oy, x1, y1, x2, y2) {
        var c = this._connections[this._connIdx % this._connections.length];
        this._connIdx++;
        c.mesh.visible = true;
        var midX = (x1 + x2) / 2;
        var midY = (y1 + y2) / 2;
        c.mesh.position.set(ox + midX, oy + midY, 0);
        var dx = x2 - x1;
        var dy = y2 - y1;
        var len = Math.sqrt(dx * dx + dy * dy);
        c.mesh.scale.set(len / 0.1, 1, 1);
        c.mesh.rotation.z = Math.atan2(dy, dx);
        c.life = 0.6 + Math.random() * 0.3;
        c.maxLife = c.life;
        c.mesh.material.opacity = 0.4;
    },
    update(model, scene, progress, time, delta, THREE) {
        var ox = this._origPos.x;
        var oy = this._origPos.y;
        var oz = this._origPos.z;

        this._waveTime += delta;
        var waveRadius = 0;

        // Phase 1: Source pulse appears (0-8%)
        if (progress < 0.08) {
            var t = progress / 0.08;
            this._source.material.opacity = t * 0.6;
            this._source.scale.setScalar(t);
        }
        // Phase 2: First wave radiates, nodes light up (8-30%)
        else if (progress < 0.30) {
            var t2 = (progress - 0.08) / 0.22;
            waveRadius = t2 * 0.5;
            this._source.material.opacity = 0.6;
            this._source.scale.setScalar(1 + Math.sin(time * 4) * 0.1);

            // Rings expand
            for (var r = 0; r < this._rings.length; r++) {
                var ring = this._rings[r];
                var ringT = Math.max(0, t2 - ring.delay);
                if (ringT > 0) {
                    ring.active = true;
                    ring.radius = ringT * ring.speed;
                    ring.mesh.scale.setScalar(ring.radius * 30);
                    ring.mesh.material.opacity = Math.max(0, 0.3 * (1 - ring.radius / ring.maxRadius));
                }
            }
        }
        // Phase 3: Signal propagates outward, cascade (30-60%)
        else if (progress < 0.60) {
            var t3 = (progress - 0.30) / 0.30;
            waveRadius = 0.5 + t3 * 0.5;
            this._source.material.opacity = 0.4 + Math.sin(time * 3) * 0.2;

            // Rings continue expanding
            for (var r2 = 0; r2 < this._rings.length; r2++) {
                var ring2 = this._rings[r2];
                ring2.radius += delta * ring2.speed * 0.5;
                if (ring2.radius > ring2.maxRadius) ring2.radius = 0;
                ring2.mesh.scale.setScalar(Math.max(ring2.radius * 30, 0.1));
                ring2.mesh.material.opacity = Math.max(0, 0.25 * (1 - ring2.radius / ring2.maxRadius));
            }

            // Cascade glow
            this._cascadeGlow.material.opacity = t3 * 0.08;
            this._cascadeGlow.scale.setScalar(1 + t3 * 0.5);
        }
        // Phase 4: Full network lit, amplification (60-82%)
        else if (progress < 0.82) {
            var t4 = (progress - 0.60) / 0.22;
            waveRadius = 1.0;

            // All rings cycle
            for (var r3 = 0; r3 < this._rings.length; r3++) {
                var ring3 = this._rings[r3];
                ring3.radius += delta * ring3.speed * 0.3;
                if (ring3.radius > ring3.maxRadius) ring3.radius = 0;
                ring3.mesh.scale.setScalar(Math.max(ring3.radius * 30, 0.1));
                ring3.mesh.material.opacity = Math.max(0, 0.2 * (1 - ring3.radius / ring3.maxRadius));
            }

            this._cascadeGlow.material.opacity = 0.08 + Math.sin(time * 2) * 0.03;
        }
        // Phase 5: Fade out (82-100%)
        else {
            var t5 = (progress - 0.82) / 0.18;

            for (var r4 = 0; r4 < this._rings.length; r4++) {
                this._rings[r4].mesh.material.opacity = 0.2 * (1 - t5);
            }
            this._source.material.opacity = 0.6 * (1 - t5);
            this._cascadeGlow.material.opacity = 0.08 * (1 - t5);

            model.position.set(ox, oy, oz);
            if (t5 > 0.8) {
                model.position.copy(this._origPos);
            }
        }

        // Update nodes - light up based on wave radius
        for (var n = 0; n < this._nodes.length; n++) {
            var nd = this._nodes[n];
            if (nd.dist < waveRadius && !nd.lit) {
                nd.lit = true;
                nd.litTime = time;
                // Spawn connection to a nearby lit node
                if (n > 0) {
                    var prevNode = this._nodes[Math.max(0, n - 1 - nd.layer)];
                    if (prevNode.lit) {
                        this._spawnConnection(ox, oy, prevNode.x, prevNode.y, nd.x, nd.y);
                    }
                }
            }

            if (nd.lit) {
                var litAge = time - nd.litTime;
                var litPulse = Math.max(0, 1 - litAge * 0.5);
                nd.mesh.material.opacity = 0.3 + litPulse * 0.5;
                nd.glow.material.opacity = litPulse * 0.25;
                nd.mesh.scale.setScalar(1 + litPulse * 0.5);
                nd.glow.scale.setScalar(1 + litPulse * 0.8);

                // Amplify effect
                if (litAge > 0.3 && litAge < 0.6) {
                    nd.mesh.material.opacity = 0.6;
                }
            }

            // Fade during cleanup
            if (progress > 0.82) {
                var fadeT = (progress - 0.82) / 0.18;
                nd.mesh.material.opacity *= (1 - fadeT);
                nd.glow.material.opacity *= (1 - fadeT);
            }
        }

        // Update connections
        for (var ci = 0; ci < this._connections.length; ci++) {
            var cn = this._connections[ci];
            if (cn.life <= 0) continue;
            cn.life -= delta;
            if (cn.life <= 0) { cn.mesh.visible = false; continue; }
            cn.mesh.material.opacity = 0.4 * (cn.life / cn.maxLife);
        }

        // Model subtle pulse
        if (progress < 0.82) {
            var modelPulse = Math.sin(time * 2) * 0.01;
            model.position.set(ox + modelPulse, oy, oz);
        }
    },
    cleanup(model, scene, THREE) {
        model.position.copy(this._origPos);
        model.scale.copy(this._origScale);
        model.rotation.z = 0;
        model.visible = true;
        if (this._rings) { this._rings.forEach(function(r) { scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); }); }
        if (this._nodes) {
            this._nodes.forEach(function(n) {
                scene.remove(n.mesh); n.mesh.geometry.dispose(); n.mesh.material.dispose();
                scene.remove(n.glow); n.glow.geometry.dispose(); n.glow.material.dispose();
            });
        }
        if (this._connections) { this._connections.forEach(function(c) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh.material.dispose(); }); }
        if (this._source) { scene.remove(this._source); this._source.geometry.dispose(); this._source.material.dispose(); }
        if (this._cascadeGlow) { scene.remove(this._cascadeGlow); this._cascadeGlow.geometry.dispose(); this._cascadeGlow.material.dispose(); }
        this._rings = this._nodes = this._connections = this._source = this._cascadeGlow = null;
    }
};