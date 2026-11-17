package reviews

import (
	"fmt"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/crypto"
	"golang.org/x/crypto/sha3"
)

// BuildCanonicalReviewMessage constructs the exact payload signed by the user's EVM wallet.
func BuildCanonicalReviewMessage(facilityAddr string, stars int32, review string, timestamp string) string {
	return fmt.Sprintf(
		"VeriFactory Review\nFacility: %s\nStars: %d\nReview: %s\nTimestamp: %s",
		strings.ToLower(strings.TrimSpace(facilityAddr)),
		stars,
		review,
		strings.TrimSpace(timestamp),
	)
}

// BuildCanonicalDeleteMessage constructs the payload signed when deleting an existing review.
func BuildCanonicalDeleteMessage(facilityAddr string, timestamp string) string {
	return fmt.Sprintf(
		"VeriFactory Delete Review\nFacility: %s\nTimestamp: %s",
		strings.ToLower(strings.TrimSpace(facilityAddr)),
		strings.TrimSpace(timestamp),
	)
}

// hederaTextHash mirrors the "\x19Hedera Signed Message:\n<len>" envelope
// used by @hashgraph/hedera-wallet-connect / HashPack personal_sign,
// and by WalletProvider.personalSignHash on the frontend.
func hederaTextHash(msg []byte) []byte {
	prefix := fmt.Sprintf("\x19Hedera Signed Message:\n%d", len(msg))
	h := sha3.NewLegacyKeccak256()
	h.Write([]byte(prefix))
	h.Write(msg)
	return h.Sum(nil)
}

// VerifyEVMSignature verifies a Hedera-wrapped personal_sign signature against expectedSigner.
func VerifyEVMSignature(expectedSigner, message, sigHex string) error {
	if !common.IsHexAddress(expectedSigner) {
		return fmt.Errorf("invalid EVM address: %s", expectedSigner)
	}

	sig, err := hexutil.Decode(strings.TrimSpace(sigHex))
	if err != nil {
		return fmt.Errorf("invalid signature hex: %w", err)
	}
	if len(sig) != 65 {
		return fmt.Errorf("invalid signature length: expected 65 bytes, got %d", len(sig))
	}

	// Normalize Ethereum V (27/28 -> 0/1)
	if sig[64] >= 27 {
		sig[64] -= 27
	}
	if sig[64] != 0 && sig[64] != 1 {
		return fmt.Errorf("invalid recovery id: %d", sig[64])
	}

	digest := hederaTextHash([]byte(message))
	pubKey, err := crypto.SigToPub(digest, sig)
	if err != nil {
		return fmt.Errorf("signature recovery failed: %w", err)
	}

	recoveredAddr := crypto.PubkeyToAddress(*pubKey)
	expectedAddr := common.HexToAddress(expectedSigner)

	if recoveredAddr != expectedAddr {
		return fmt.Errorf("signer mismatch: recovered %s, expected %s", recoveredAddr.Hex(), expectedAddr.Hex())
	}

	return nil
}