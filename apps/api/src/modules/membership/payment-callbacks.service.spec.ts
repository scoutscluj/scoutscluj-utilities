import { PaymentCallbacksService } from './payment-callbacks.service';
describe('payment callback routing', () => {
  it('preserves membership fallback and unregisters additional domains', async () => {
    const router = new PaymentCallbacksService();
    expect(
      await router.dispatch('stripe', Buffer.from('{}'), 'signature'),
    ).toBe(false);
    const handle = jest.fn().mockResolvedValue(true);
    const remove = router.register(handle);
    expect(
      await router.dispatch('stripe', Buffer.from('{}'), 'signature'),
    ).toBe(true);
    remove();
    expect(
      await router.dispatch('stripe', Buffer.from('{}'), 'signature'),
    ).toBe(false);
    expect(handle).toHaveBeenCalledTimes(1);
  });
  it('propagates a failed signature rather than trying another payment domain', async () => {
    const router = new PaymentCallbacksService();
    router.register(() => Promise.reject(new Error('Invalid signature')));
    const second = jest.fn().mockResolvedValue(true);
    router.register(second);
    await expect(
      router.dispatch('netopia', Buffer.from('{}'), 'invalid'),
    ).rejects.toThrow('Invalid signature');
    expect(second).not.toHaveBeenCalled();
  });
});
