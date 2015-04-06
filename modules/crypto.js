simpl.add('crypto', function() {

/** crypto: {
      sha256: function(data=undefined:ArrayBuffer) -> ArrayBuffer|MessageDigest,
      hmac: function(key:ArrayBuffer, data=undefined:ArrayBuffer) -> ArrayBuffer|function(data:ArrayBuffer) -> ArrayBuffer,
      pbkdf2: function(password:ArrayBuffer, salt:ArrayBuffer) -> ArrayBuffer
    }

    Cryptographic functions. `sha256` returns an ArrayBuffer hash if `data` is provided up front, or a MessageDigest
    object otherwise. `hmac` uses the `sha256` hash function and returns an ArrayBuffer MAC if `data` is provided up
    front, or a MAC generator function otherwise. */

/** MessageDigest: {
      update: function(data:ArrayBuffer) -> MessageDigest,
      digest: function -> ArrayBuffer
    } */
  
  var sha256Init = [
    0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  var sha256Key = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  
  var sha256 = function(length, bufferLength, buffer, h0, h1, h2, h3, h4, h5, h6, h7) {
    var self,
        bufferBytes = new Uint8Array(64),
        bufferData = new DataView(bufferBytes.buffer);
    if (buffer && bufferLength) bufferBytes.set(buffer.subarray(0, bufferLength));
    return self = {
      update: function(data) {
        var offset = 0,
            len = data.byteLength,
            words = [];
        if (!length) {
          h0 = sha256Init[0]; h1 = sha256Init[1]; h2 = sha256Init[2]; h3 = sha256Init[3];
          h4 = sha256Init[4]; h5 = sha256Init[5]; h6 = sha256Init[6]; h7 = sha256Init[7];
        }
        length += len;
        data = new Uint8Array(data);
        do {
          bufferBytes.set(data.subarray(offset, offset+64-bufferLength), bufferLength);
          if (bufferLength + len - offset < 64) {
            bufferLength += len - offset;
            break;
          }
          offset += 64 - bufferLength;
          bufferLength = 0;
          var i, a, b, tmp,
              i0 = h0, i1 = h1, i2 = h2, i3 = h3,
              i4 = h4, i5 = h5, i6 = h6, i7 = h7;
          for (i = 0; i < 16; i++)
            words[i] = bufferData.getUint32(i*4);
          for (i = 0; i < 64; i++) {
            if (i < 16) {
              tmp = words[i];
            } else {
              a = words[i+1 & 15];
              b = words[i+14 & 15];
              tmp = words[i&15] = (a>>>7  ^ a>>>18 ^ a>>>3  ^ a<<25 ^ a<<14) + 
                (b>>>17 ^ b>>>19 ^ b>>>10 ^ b<<15 ^ b<<13) +
                words[i&15] + words[i+9 & 15] | 0;
            }
            tmp += i7 + (i4>>>6 ^ i4>>>11 ^ i4>>>25 ^ i4<<26 ^ i4<<21 ^ i4<<7) + (i6 ^ i4&(i5^i6)) + sha256Key[i];
            i7 = i6; i6 = i5; i5 = i4;
            i4 = i3 + tmp | 0;
            i3 = i2; i2 = i1; i1 = i0;
            i0 = tmp + (i1&i2 ^ i3&(i1^i2)) + (i1>>>2 ^ i1>>>13 ^ i1>>>22 ^ i1<<30 ^ i1<<19 ^ i1<<10) | 0;
          }
          h0 = h0+i0 | 0;
          h1 = h1+i1 | 0;
          h2 = h2+i2 | 0;
          h3 = h3+i3 | 0;
          h4 = h4+i4 | 0;
          h5 = h5+i5 | 0;
          h6 = h6+i6 | 0;
          h7 = h7+i7 | 0;
        } while (true);
        return self;
      },
      digest: function() {
        var len = (bufferLength < 56 ? 64 : 128) - bufferLength,
            padding = new DataView(new ArrayBuffer(len)),
            hash = new DataView(new ArrayBuffer(32));
        length *= 8;
        padding.setUint8(0, 128);
        padding.setUint32(len-8, length / 0x100000000 | 0);
        padding.setUint32(len-4, length | 0);
        self.update(padding.buffer);
        [h0,h1,h2,h3,h4,h5,h6,h7].forEach(function(h, i) { hash.setUint32(i*4, h); });
        length = bufferLength = 0;
        return hash.buffer;
      },
      clone: function() {
        return sha256(length, bufferLength, bufferBytes, h0, h1, h2, h3, h4, h5, h6, h7);
      }
    };
  };
  
  var self;
  return self = {
    sha256: function(data) {
      var hash = sha256(0, 0);
      return data ? hash.update(data).digest() : hash;
    },
    hmac: function(key, data) {
      var hash = self.sha256, k,
          a = new DataView(new ArrayBuffer(64)),
          b = new DataView(new ArrayBuffer(64));
      if (key.byteLength > 64)
        key = hash(key);
      if (key.byteLength < 64) {
        k = new Uint8Array(new ArrayBuffer(64));
        k.set(new Uint8Array(key));
        key = k.buffer;
      }
      key = new DataView(key);
      for (var i = 0; i < 64; i += 4) {
        k = key.getUint32(i);
        a.setUint32(i, k ^ 0x36363636);
        b.setUint32(i, k ^ 0x5C5C5C5C);
      }
      a = hash().update(a.buffer);
      b = hash().update(b.buffer);
      return data ? b.update(a.update(data).digest()).digest() : function(data) {
        return b.clone().update(a.clone().update(data).digest()).digest();
      };
    },
    pbkdf2: function(password, salt) {
      var key, prf = self.hmac(password);
      var s = new Uint8Array(salt.byteLength+4);
      s.set(new Uint8Array(salt));
      s[s.length-1] = 1;
      var k = key = new Uint8Array(prf(s.buffer));
      for (var i = 1; i < 1000; i++) {
        k = new Uint8Array(prf(k.buffer));
        for (var j = 0; j < k.length; j++)
          key[j] ^= k[j];
      }
      return key.buffer;
    }
  };
});