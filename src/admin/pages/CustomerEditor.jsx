import { api } from '../../lib/api/index.js';
import { useAsync, useToast, PageHead, Loading, ErrorBox, navigate } from '../ui.jsx';
import CustomerForm from '../CustomerForm.jsx';

export default function CustomerEditor({ id }) {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => (id ? api.getCustomer(id) : Promise.resolve(null)), [id]);
  if (loading && id) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const c = data?.customer;
  return (
    <>
      <PageHead back={id ? `/admin/customers/${id}` : '/admin/customers'} title={id ? `Edit ${c.shop_name}` : 'Add customer'} />
      <section className="card narrow">
        <CustomerForm
          initial={c ? { id: c.id, shop_name: c.shop_name, contact_name: c.contact_name, phone: c.phone, city: c.city, gstin: c.gstin, address: c.address, notes: c.notes } : {}}
          onCancel={() => navigate(id ? `/admin/customers/${id}` : '/admin/customers')}
          onSaved={(newId) => {
            toast(id ? 'Customer updated' : 'Customer added');
            navigate(`/admin/customers/${newId}`, { replace: true });
          }}
        />
      </section>
    </>
  );
}
