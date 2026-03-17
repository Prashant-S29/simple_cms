import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

interface Props {
  trigger: React.ReactElement;
  title: string;
  desc: string;
  form: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const FormDialog: React.FC<Props> = ({
  trigger,
  desc,
  title,
  form,
  open,
  onOpenChange,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
};
