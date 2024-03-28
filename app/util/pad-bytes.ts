export function padBytesEnd(bytes: Uint8Array, length: number) {
    if (bytes.length < length) {
        const paddedArray = new Uint8Array(length);
        paddedArray.set(bytes);
        return paddedArray;
    }

    return bytes;
}