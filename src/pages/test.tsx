import {useEffect} from 'react';
import * as bigintBuffer from "bigint-buffer";

export default function Test() {
  useEffect(() => {
    const ff = require("ffjavascript");
    const bb = require("bigint-buffer");

    //  TEST EXAMPLE:  G1 generator
    const g1_gen = '97f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bb';
    const g2_gen = '824aa2b2f08f0a91260805272dc51051c6e47ad4fa403b02b4510b647ae3d1770bac0326a805bbefd48056c8c121bdb813e02b6052719f607dacd3a088274f65596bd0d09920b61ab5da61bbdc7f5049334cf11213945d57e5ac7d055d042b7e';

    //  COMPRESSION FUNCTIONS
    async function compressedG1(point: Array<string | bigint>) {
      const curve = await ff.getCurveFromName("bls12381");

      const result = bb.toBufferBE(BigInt(point[0]), 48);
      const COMPRESSED = 0b10000000;
      const INFINITY = 0b01000000;
      const YBIT = 0b00100000;

      result[0] = result[0] | COMPRESSED;

      if (BigInt(point[2]) !== BigInt(1)) {
	result[0] = result[0] | INFINITY;
      } else {
	const F = curve.G1.F;

	const x = F.fromObject(BigInt(point[0]));

	const x3b = F.add(F.mul(F.square(x), x), curve.G1.b);

	const y = F.fromObject(BigInt(point[1]));
	const y2 = F.square(y);

	if (F.eq(y2, x3b)) {
	  const ya = F.toObject(y);
	  const yb = F.toObject(F.neg(y));
	  if (ya > yb) {
	    result[0] = result[0] | YBIT;
	  }
	} else {
	  throw new Error("point not on G1");
	}
      }

      return result.toString("hex");
    }

    async function compressedG2(point: Array<Array<string | bigint>>) {
      const curve = await ff.getCurveFromName("bls12381");

      // const result = Buffer.concat([                  * NOTE:  reverted the order *
      // 	bb.toBufferBE(BigInt(point[0][1]), 48),
      // 	bb.toBufferBE(BigInt(point[0][0]), 48),
      // ]);
      const result = Buffer.concat([
	bb.toBufferBE(BigInt(point[0][0]), 48),
	bb.toBufferBE(BigInt(point[0][1]), 48)
      ]);
      const COMPRESSED = 0b10000000;
      const INFINITY = 0b01000000;
      const YBIT = 0b00100000;

      result[0] = result[0] | COMPRESSED;

      if (BigInt(point[2][0]) !== BigInt(1)) {
	result[0] = result[0] | INFINITY;
      } else {
	const F = curve.G2.F;

	const x = F.fromObject(point[0].map((item) => BigInt(item)));

	const x3b = F.add(F.mul(F.square(x), x), curve.G2.b);

	const y = F.fromObject(point[1].map((item) => BigInt(item)));
	const y2 = F.square(y);

	if (F.eq(y2, x3b)) {
	  const ya = F.toObject(y);
	  const yb = F.toObject(F.neg(y));
	  if (greaterThan(ya, yb)) {
	    result[0] = result[0] | YBIT;
	  }
	} else {
	  throw new Error("point not on G2");
	}
      }
      return result.toString("hex");
    }

    function greaterThan(a: Array<BigInt>, b: Array<BigInt>) {
      if (a[1] > b[1]) {
	return true;
      } else if (a[1] === b[1] && a[0] > b[0]) {
	return true;
      }
      return false;
    }

    function bytesToBigInt(bytes: number[]): bigint {
      const l = bytes.length;

      let result = BigInt(0);
      for (let i = 0; i < bytes.length; i++) {
	// Shift each byte and add it to the result
	result += BigInt(bytes[i]) << BigInt((l - i - 1) * 8);
      }

      return result;
    }

    function bytesUntaggedToBigInt(bytes: number[]): bigint {
      const l     = bytes.length;
      const UNTAG = 0b00011111;

      // Shift untagged first byte
      let result = BigInt(bytes[0] & UNTAG) << BigInt((l - 1) * 8);
      for (let i = 1; i < bytes.length; i++) {
	// Shift each byte and add it to the result
	result += BigInt(bytes[i]) << BigInt((l - i - 1) * 8);
      }

      return result;
    }
    

    // UNCOMPRESSION FUNCTIONS

    async function uncompressedG1(point: string) {
      const curve = await ff.getCurveFromName("bls12381");
      const F = curve.G1.F;

      const COMPRESSED = 0b10000000;
      const INFINITY = 0b01000000;
      const YBIT = 0b00100000;

      const buffer = Buffer.from(point, "hex");

      if (buffer.length != 48 || (buffer[0] & COMPRESSED) === 0) {
	throw new Error("Invalid format");
      }

      if ((buffer[0] & INFINITY) !== 0) {
	return [BigInt(1), BigInt(1), BigInt(0)];
      }

      const xn  = bytesUntaggedToBigInt(buffer);
      const x   = F.fromObject(xn);
      const x3b = F.add(F.mul(F.square(x), x), curve.G1.b);

      const y  = F.sqrt(x3b);
      const y1 = F.toObject(y);
      const y2 = F.toObject(F.neg(y));

      let yn;
      if (buffer[0] & YBIT) {
	yn = y1 > y2 ? y1 : y2;
      } else {
	yn = y1 > y2 ? y2 : y1;
      }

      return [xn, yn, BigInt(1)];
    }

    async function uncompressedG2(point: string) {
      const curve = await ff.getCurveFromName("bls12381");
      const F = curve.G2.F;
      
      const COMPRESSED = 0b10000000;
      const INFINITY = 0b01000000;
      const YBIT = 0b00100000;

      const buffer = Buffer.from(point, "hex");

      if (buffer.length != 96 || (buffer[0] & COMPRESSED) === 0) {
	throw new Error("Invalid format");
      }

      if ((buffer[0] & INFINITY) !== 0) {
	return [
	  [BigInt(1), BigInt(0)], [BigInt(1), BigInt(0)], [BigInt(0), BigInt(0)]
	];
      }

      const xn  = [
	bytesUntaggedToBigInt(buffer.slice(0, 48)),
	bytesToBigInt(buffer.slice(48))
      ];

      const x   = F.fromObject(xn);
      const x3b = F.add(F.mul(F.square(x), x), curve.G2.b);

      const y  = F.sqrt(x3b);
      const y1 = F.toObject(y);
      const y2 = F.toObject(F.neg(y));

      let yn;
      if (buffer[0] & YBIT) {
	yn = greaterThan(y1, y2) ? y1 : y2;
      } else {
	yn = greaterThan(y1, y2) ? y2 : y1;
      }

      return [xn, yn, [BigInt(1), BigInt(0)]]
    }
    

    // TESTS

    console.log('Now some tests!');

    async function print_uncompressedG1(g1: string) {
      try {
	const unG1 = await uncompressedG1(g1);
	console.log("unG1:", unG1);
      } catch (e) {
	console.error("Error: ", e);
      }
    }

    async function print_uncompressedG2(g2: string) {
      try {
	const unG2 = await uncompressedG2(g2);
	console.log("unG2:", unG2);
      } catch (e) {
	console.error("Error: ", e);
      }
    }

    async function print_identityG1(g1: string) {
      try {
	const unG1  = await uncompressedG1(g1);
	const comG1 = await compressedG1(unG1);

	console.log("Identity on G1:", g1 === comG1);
      } catch (e) {
	console.error("Error: ", e);
      }
    }

    async function print_identityG2(g2: string) {
      try {
	const unG2  = await uncompressedG2(g2);
	const comG2 = await compressedG2(unG2);

	console.log("Identity on G2:", g2 === comG2);
      } catch (e) {
	console.error("Error: ", e);
      }
    }

    print_uncompressedG1(g1_gen);
    print_uncompressedG2(g2_gen);
    print_identityG1(g1_gen);
    print_identityG2(g2_gen);
  }, []);
  
  return (
    <div>
      <h1 style={{ color: '#ffffff' }}>TypeScript Test</h1>
    </div>
  );
}
